// src/crypto/KeyManager.ts
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { buf } from './bytes';

const subtle = globalThis.crypto.subtle;
const MASTER_KEY_ID = 'wellium/master-key-v1';

/* --------------------------- base64url helpers --------------------------- */
export function bytesToB64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function ensureKyberKem(): Promise<void> {
    return Promise.resolve();
}

/* ------ deterministic derivation from QR pairing secret (storage key) ----- */
export async function deriveKeysFromSecret(secretB64: string): Promise<{ aes: CryptoKey; tag: string }> {
    const secret = b64urlToBytes(secretB64);
    const ikm = await subtle.importKey('raw', buf(secret), 'HKDF', false, ['deriveKey']);
    const salt = new Uint8Array(32);
    const info = new TextEncoder().encode('wellium/storage/v1');

    const aes = await subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) },
        ikm,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    const digest = new Uint8Array(await subtle.digest('SHA-256', buf(secret)));
    const tag = bytesToB64url(digest);
    return { aes, tag };
}

export async function kyberFingerprintB64url(pkB64: string): Promise<string> {
    const pk = b64urlToBytes(pkB64);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(pk)));
    return bytesToB64url(digest.slice(0, 10));
}

/* ========================= KEM interface + registry ======================= */
export type KemCapsule = Uint8Array;
export type KemSharedSecret = Uint8Array;

export interface KemProvider {
    readonly name: string;
    generateKeyPair(): Promise<{ publicRaw: Uint8Array; privateBytes: Uint8Array }>;
    encapsulate(peerPublicRaw: Uint8Array): Promise<{ shared: KemSharedSecret; capsule: KemCapsule }>;
    decapsulate(capsule: KemCapsule, privateBytes: Uint8Array): Promise<KemSharedSecret>;
}

class KemRegistry {
    private _p: KemProvider | null = null;
    use(p: KemProvider) { this._p = p; }
    get(): KemProvider {
        if (!this._p) throw new Error('No KEM provider registered');
        return this._p;
    }
}
const kemRegistry = new KemRegistry();

/** Access the active KEM provider (registered below). */
export const kem = { get: () => kemRegistry.get() };

/* ---------------------- default provider: ECDH P-256 ---------------------- */
class EcdhP256Provider implements KemProvider {
    readonly name = 'ECDH-P256';
    async generateKeyPair() {
        const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const publicRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
        const privateBytes = new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey));
        return { publicRaw, privateBytes };
    }
    async encapsulate(peerPublicRaw: Uint8Array) {
        const peerPub = await subtle.importKey('raw', buf(peerPublicRaw), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const capsule = new Uint8Array(await subtle.exportKey('raw', eph.publicKey));
        const bits = await subtle.deriveBits({ name: 'ECDH', public: peerPub }, eph.privateKey, 256);
        return { shared: new Uint8Array(bits), capsule };
    }
    async decapsulate(capsule: Uint8Array, privateBytes: Uint8Array) {
        const sk = await subtle.importKey('pkcs8', buf(privateBytes), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
        const ephPub = await subtle.importKey('raw', buf(capsule), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const bits = await subtle.deriveBits({ name: 'ECDH', public: ephPub }, sk, 256);
        return new Uint8Array(bits);
    }
}

/* ================================ Manager ================================= */
export class KeyManager {
    private storage = new CapacitorStorageAdapter();
    private cached?: CryptoKey;
    static useKemProvider(p: KemProvider) { kemRegistry.use(p); }
    static installPreferredKem(_opts?: { requirePQ?: boolean }) {
        kemRegistry.use(new EcdhP256Provider());
    }
    /* -------------------- AES master (at-rest) -------------------- */
    async ensureMasterKey(): Promise<CryptoKey> {
        if (this.cached) return this.cached;

        const jwkBlob = await this.storage.loadBlob(MASTER_KEY_ID).catch(() => undefined);
        if (jwkBlob) {
            const jwk = JSON.parse(new TextDecoder().decode(jwkBlob));
            this.cached = await subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
            return this.cached;
        }

        const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
        return key;
    }

    async getKeyForStorage(): Promise<CryptoKey> {
        return this.ensureMasterKey();
    }

    /* --------- wrap/unwrap via QR pairing secret (AES) ---------- */
    async exportWrappedForPairing(pairingSecret: Uint8Array): Promise<string> {
        const master = await this.ensureMasterKey();
        const masterJwk = await subtle.exportKey('jwk', master);
        const pt = new TextEncoder().encode(JSON.stringify({ v: 1, k: masterJwk }));

        const wrapKey = await subtle.importKey('raw', buf(pairingSecret), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, wrapKey, buf(pt)));

        const out = new Uint8Array(iv.length + ct.length);
        out.set(iv, 0); out.set(ct, iv.length);
        return bytesToB64url(out);
    }

    async importWrappedFromPairing(pairingSecret: Uint8Array, wrappedB64: string): Promise<void> {
        const all = b64urlToBytes(wrappedB64);
        const iv = all.slice(0, 12), ct = all.slice(12);
        const wrapKey = await subtle.importKey('raw', buf(pairingSecret), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const pt = await subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, wrapKey, buf(ct));
        const { v, k } = JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
        if (v !== 1 || !k) throw new Error('bad pairing payload');

        const key = await subtle.importKey('jwk', k, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
    }

    /* ----------------------- KEM (pluggable) ---------------------- */

    private kemKey(kind: 'pk' | 'sk', kemName: string) {
        return `wellium/kem/${kemName}/${kind}`;
    }

    /** Create/load local KEM keypair. Returns local public key (base64url). */
    async getLocalKemPublicKeyB64(): Promise<string> {
        const provider = kem.get();
        const pkKey = this.kemKey('pk', provider.name);
        const skKey = this.kemKey('sk', provider.name);

        try {
            const pkBlob = await this.storage.loadBlob(pkKey);
            const skBlob = await this.storage.loadBlob(skKey);
            if (pkBlob && skBlob) {
                return new TextDecoder().decode(pkBlob);
            }
        } catch { /* continue */ }

        const { publicRaw, privateBytes } = await provider.generateKeyPair();
        const pkB64 = bytesToB64url(publicRaw);
        const skB64 = bytesToB64url(privateBytes);

        await this.storage.saveBlob(pkKey, new TextEncoder().encode(pkB64));
        await this.storage.saveBlob(skKey, new TextEncoder().encode(skB64));
        return pkB64;
    }

    /** Wrap our master key for a peer (KEM-based). */
    async exportWrappedForPeer(peerPublicKeyB64: string): Promise<string> {
        const provider = kem.get();
        const peerRaw = b64urlToBytes(peerPublicKeyB64);

        const { shared, capsule } = await provider.encapsulate(peerRaw);

        const ikm = await subtle.importKey('raw', buf(shared), 'HKDF', false, ['deriveKey']);
        const info = new TextEncoder().encode(`wellium/kem-wrap/${provider.name}/v1`);
        const salt = new Uint8Array(32);
        const wrapKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) },
            ikm,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const master = await this.ensureMasterKey();
        const masterJwk = await subtle.exportKey('jwk', master);
        const pt = new TextEncoder().encode(JSON.stringify({ v: 2, k: masterJwk }));

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, wrapKey, buf(pt)));

        const payload = {
            v: 2,
            kem: provider.name,
            e: bytesToB64url(capsule),
            iv: bytesToB64url(iv),
            ct: bytesToB64url(ct),
        };
        return bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
    }

    /** Receive, KEM-decapsulate, and install a peer-wrapped master key. */
    async importWrappedFromPeer(payloadB64: string): Promise<void> {
        const provider = kem.get();
        const obj = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64))) as {
            v: number; kem: string; e: string; iv: string; ct: string;
        };
        if (obj.v !== 2 || obj.kem !== provider.name) throw new Error('bad kem payload');

        const capsule = b64urlToBytes(obj.e);
        const iv = b64urlToBytes(obj.iv);
        const ct = b64urlToBytes(obj.ct);

        const skBlob = await this.storage.loadBlob(this.kemKey('sk', provider.name));
        if (!skBlob) throw new Error('no local kem secret');
        const skBytes = b64urlToBytes(new TextDecoder().decode(skBlob));

        const shared = await provider.decapsulate(capsule, skBytes);

        const ikm = await subtle.importKey('raw', buf(shared), 'HKDF', false, ['deriveKey']);
        const info = new TextEncoder().encode(`wellium/kem-wrap/${provider.name}/v1`);
        const salt = new Uint8Array(32);
        const unwrapKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) },
            ikm,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        const pt = await subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, unwrapKey, buf(ct));
        const { v, k } = JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
        if (v !== 2 || !k) throw new Error('bad wrapped master');

        const key = await subtle.importKey('jwk', k, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
    }

    /** Invitation blob that carries both KEM-wrapped master and pairing secret. */
    async exportInvitationForPeer(
        peerPublicKeyB64: string,
        pairingSecretB64: string,
    ): Promise<string> {
        const wrappedMaster = await this.exportWrappedForPeer(peerPublicKeyB64);
        const payload = {
            v: 3,
            pairingSecret: pairingSecretB64,
            wrappedMaster,
        };
        return bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
    }

    async importInvitationFromPeer(payloadB64: string): Promise<string> {
        const raw = new TextDecoder().decode(b64urlToBytes(payloadB64));
        const { v, pairingSecret, wrappedMaster } = JSON.parse(raw);
        if (v !== 3 || !pairingSecret || !wrappedMaster) {
            throw new Error('bad invitation payload');
        }
        await this.importWrappedFromPeer(wrappedMaster);
        return pairingSecret;
    }
}

// Register a default provider immediately (you can replace it on app init)
KeyManager.installPreferredKem();
