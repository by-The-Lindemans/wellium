// src/crypto/KeyManager.ts
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import type { KyberProvider } from './pq/interfaces';
import { loadKyberProvider } from './pq/loadKyber';

const subtle = globalThis.crypto.subtle;
const MASTER_KEY_ID = 'wellium/master-key-v1';

/* --------------------------- base64url helpers --------------------------- */
export function bytesToB64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

/* ------ deterministic derivation from QR pairing secret (storage key) ----- */
export async function deriveKeysFromSecret(secretB64: string): Promise<{ aes: CryptoKey; tag: string }> {
    const secret = b64urlToBytes(secretB64);
    const ikm = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
    const salt = new Uint8Array(32);
    const info = new TextEncoder().encode('wellium/storage/v1');

    const aes = await subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        ikm,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    const digest = new Uint8Array(await subtle.digest('SHA-256', secret));
    const tag = bytesToB64url(digest);
    return { aes, tag };
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

// NEW: ensure the Kyber provider is loaded (and required everywhere)
let kemInitPromise: Promise<void> | null = null;
export function ensureKyberKem(): Promise<void> {
    if (!kemInitPromise) {
        kemInitPromise = (async () => {
            const provider = await loadKyberProvider();
            kemRegistry.use(provider);
        })();
    }
    return kemInitPromise;
}

/* ---------------------- default provider: ECDH P-256 ---------------------- */
/* Classical fallback. For production PQ, prefer ML-KEM; see installPreferredKem(). */
class EcdhP256Provider implements KemProvider {
    readonly name = 'ECDH-P256';
    async generateKeyPair() {
        const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const publicRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
        const privateBytes = new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey));
        return { publicRaw, privateBytes };
    }
    async encapsulate(peerPublicRaw: Uint8Array) {
        const peerPub = await subtle.importKey('raw', peerPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const capsule = new Uint8Array(await subtle.exportKey('raw', eph.publicKey));
        const bits = await subtle.deriveBits({ name: 'ECDH', public: peerPub }, eph.privateKey, 256);
        return { shared: new Uint8Array(bits), capsule };
    }
    async decapsulate(capsule: Uint8Array, privateBytes: Uint8Array) {
        const sk = await subtle.importKey('pkcs8', privateBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
        const ephPub = await subtle.importKey('raw', capsule, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const bits = await subtle.deriveBits({ name: 'ECDH', public: ephPub }, sk, 256);
        return new Uint8Array(bits);
    }
}

/* ---------------------- Kyber adapter → KemProvider ----------------------- */
class KyberKemAdapter implements KemProvider {
    readonly name: string;
    constructor(private kyber: KyberProvider) {
        this.name = kyber.alg;
    }
    async generateKeyPair() {
        const kp = await this.kyber.generateKeypair();
        return { publicRaw: kp.publicKey, privateBytes: kp.secretKey };
    }
    async encapsulate(peerPublicRaw: Uint8Array) {
        const { ciphertext, sharedSecret } = await this.kyber.encapsulate(peerPublicRaw);
        return { shared: sharedSecret, capsule: ciphertext };
    }
    async decapsulate(capsule: Uint8Array, privateBytes: Uint8Array) {
        return this.kyber.decapsulate(capsule, privateBytes);
    }
}

/* ================================ Manager ================================= */
export class KeyManager {
    private storage = new CapacitorStorageAdapter();
    private cached?: CryptoKey;

    /* Install PQ KEM if available; otherwise keep fallback. Call once on app start. */
    static async installPreferredKem(opts: { requirePQ?: boolean } = {}) {
        const kyber = await loadKyberProvider();
        if (kyber) {
            kemRegistry.use(new KyberKemAdapter(kyber));
            return;
        }
        if (opts.requirePQ) throw new Error('PQC KEM provider not available');
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

        const wrapKey = await subtle.importKey('raw', pairingSecret, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, pt));

        const out = new Uint8Array(iv.length + ct.length);
        out.set(iv, 0); out.set(ct, iv.length);
        return bytesToB64url(out);
    }

    async importWrappedFromPairing(pairingSecret: Uint8Array, wrappedB64: string): Promise<void> {
        const all = b64urlToBytes(wrappedB64);
        const iv = all.slice(0, 12), ct = all.slice(12);
        const wrapKey = await subtle.importKey('raw', pairingSecret, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, ct);
        const { v, k } = JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
        if (v !== 1 || !k) throw new Error('bad pairing payload');

        const key = await subtle.importKey('jwk', k, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
    }

    /* ----------------------- KEM (pluggable) ---------------------- */
    static useKemProvider(p: KemProvider) { kemRegistry.use(p); }

    private kemKey(kind: 'pk' | 'sk', kemName: string) {
        return `wellium/kem/${kemName}/${kind}`;
    }

    /** Create/load local KEM keypair. Returns local public key (base64url). */
    async getLocalKemPublicKeyB64(): Promise<string> {
        await ensureKyberKem();                        // <—— require Kyber
        const kem = kemRegistry.get();
        const pkKey = this.kemKey('pk', kem.name);
        const skKey = this.kemKey('sk', kem.name);

        // Try already stored
        try {
            const pkBlob = await this.storage.loadBlob(pkKey);
            const skBlob = await this.storage.loadBlob(skKey);
            if (pkBlob && skBlob) {
                return new TextDecoder().decode(pkBlob);
            }
        } catch { /* continue */ }

        // Generate/persist
        const { publicRaw, privateBytes } = await kem.generateKeyPair();
        const pkB64 = bytesToB64url(publicRaw);
        const skB64 = bytesToB64url(privateBytes);

        await this.storage.saveBlob(pkKey, new TextEncoder().encode(pkB64));
        await this.storage.saveBlob(skKey, new TextEncoder().encode(skB64));
        return pkB64;
    }

    /** Wrap our master key for a peer (KEM-based). */
    async exportWrappedForPeer(peerPublicKeyB64: string): Promise<string> {
        await ensureKyberKem();                        // <—— require Kyber
        const kem = kemRegistry.get();
        const peerRaw = b64urlToBytes(peerPublicKeyB64);

        const { shared, capsule } = await kem.encapsulate(peerRaw);

        const ikm = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
        const info = new TextEncoder().encode(`wellium/kem-wrap/${kem.name}/v1`);
        const salt = new Uint8Array(32);
        const wrapKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt, info },
            ikm,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const master = await this.ensureMasterKey();
        const masterJwk = await subtle.exportKey('jwk', master);
        const pt = new TextEncoder().encode(JSON.stringify({ v: 2, k: masterJwk }));

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, pt));

        const payload = {
            v: 2,
            kem: kem.name,
            e: bytesToB64url(capsule),
            iv: bytesToB64url(iv),
            ct: bytesToB64url(ct),
        };
        return bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
    }

    /** Receive, KEM-decapsulate, and install a peer-wrapped master key. */
    async importWrappedFromPeer(payloadB64: string): Promise<void> {
        await ensureKyberKem();                        // <—— require Kyber
        const kem = kemRegistry.get();
        const obj = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64))) as {
            v: number; kem: string; e: string; iv: string; ct: string;
        };
        if (obj.v !== 2 || obj.kem !== kem.name) throw new Error('bad kem payload');

        const capsule = b64urlToBytes(obj.e);
        const iv = b64urlToBytes(obj.iv);
        const ct = b64urlToBytes(obj.ct);

        const skBlob = await this.storage.loadBlob(this.kemKey('sk', kem.name));
        if (!skBlob) throw new Error('no local kem secret');
        const skBytes = b64urlToBytes(new TextDecoder().decode(skBlob));

        const shared = await kem.decapsulate(capsule, skBytes);

        const ikm = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
        const info = new TextEncoder().encode(`wellium/kem-wrap/${kem.name}/v1`);
        const salt = new Uint8Array(32);
        const unwrapKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt, info },
            ikm,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, unwrapKey, ct);
        const { v, k } = JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
        if (v !== 2 || !k) throw new Error('bad wrapped master');

        const key = await subtle.importKey('jwk', k, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
    }
}