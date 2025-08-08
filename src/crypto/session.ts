// src/crypto/session.ts
import { kem, type KemProvider } from './KeyManager';
import { buf } from './bytes';

export type SessionKey = CryptoKey;  // AES-GCM key (256-bit)

type HandshakeState = 'idle' | 'established' | 'error';

/** HKDF-SHA256 -> AES-GCM 256-bit key */
async function hkdfToAesKey(ikm: Uint8Array, infoStr: string): Promise<CryptoKey> {
    const salt = new Uint8Array(32); // all-zero salt
    const info = new TextEncoder().encode(infoStr);
    const ikmKey = await crypto.subtle.importKey('raw', buf(ikm), 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) },
        ikmKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export type WireMsg =
    | { t: 'hs1'; kem: string; to: string; from: string }
    | { t: 'hs2'; kem: string; to: string; from: string; capsule: string }
    | { t: 'u'; iv: string; ct: string };  // encrypted Y update

/** A small per-peer session that performs KEM handshake & encrypts updates. */
export class PeerSession {
    private state: HandshakeState = 'idle';
    private sessionKey?: SessionKey;

    constructor(
        private readonly kem: KemProvider,
        /** Our static KEM secret key (base64url). */
        private readonly myKemSkB64: string,
        /** Their static KEM public key (base64url). */
        private readonly theirKemPkB64: string,
        /** For binding/debug (room id etc.) */
        private readonly contextInfo = 'wellium/rtc/session/v1'
    ) { }

    get established() { return this.state === 'established'; }

    /** A starts: send hs1 (announcement); B replies with hs2 (capsule) */
    makeHs1(fromId: string, toId: string): WireMsg {
        return { t: 'hs1', kem: this.kem.name, from: fromId, to: toId };
    }

    /** Produce hs2 (capsule) on the **initiator** (A) side */
    async initiatorEncap(): Promise<WireMsg> {
        const peerPk = ((): Uint8Array => {
            const b = this.theirKemPkB64.replace(/-/g, '+').replace(/_/g, '/');
            const raw = atob(b);
            return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
        })();
        const { capsule, shared } = await this.kem.encapsulate(peerPk);
        this.sessionKey = await hkdfToAesKey(shared, this.contextInfo);
        this.state = 'established';
        return { t: 'hs2', kem: this.kem.name, from: '', to: '', capsule: b64url(capsule) };
    }

    /** Completes session on **responder** (B) side given hs2 capsule */
    async responderDecap(hs2: Extract<WireMsg, { t: 'hs2' }>): Promise<void> {
        if (this.state !== 'idle') return;
        const capsule = ub64(hs2.capsule);
        const sk = ub64(this.myKemSkB64);
        const shared = await this.kem.decapsulate(capsule, sk);
        this.sessionKey = await hkdfToAesKey(shared, this.contextInfo);
        this.state = 'established';
    }

    /** Encrypt a Yjs binary update for wire */
    async sealUpdate(update: Uint8Array): Promise<Extract<WireMsg, { t: 'u' }>> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: buf(iv) },
            this.sessionKey,
            buf(update)
        ));
        return { t: 'u', iv: b64url(iv), ct: b64url(ct) };
    }

    /** Decrypt a wire update into Yjs update bytes */
    async openUpdate(msg: Extract<WireMsg, { t: 'u' }>): Promise<Uint8Array> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = ub64(msg.iv);
        const ct = ub64(msg.ct);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, this.sessionKey, buf(ct));
        return new Uint8Array(pt);
    }

    /** Generic seal/open (used e.g. for bootstrap payloads) */
    async seal(pt: Uint8Array): Promise<Uint8Array> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, this.sessionKey, buf(pt)));
        const out = new Uint8Array(12 + ct.length);
        out.set(iv, 0); out.set(ct, 12);
        return out;
    }
    async open(blob: Uint8Array): Promise<Uint8Array> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = blob.slice(0, 12), ct = blob.slice(12);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, this.sessionKey, buf(ct));
        return new Uint8Array(pt);
    }
}

/* ----------------------- misc helpers ----------------------- */

export async function aesGcmEncrypt(
    keyRaw32: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array
): Promise<{ iv: Uint8Array; ct: Uint8Array }> {
    const key = await crypto.subtle.importKey('raw', buf(keyRaw32), { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(iv), additionalData: aad && buf(aad) }, key, buf(plaintext)));
    return { iv, ct };
}

export async function aesGcmDecrypt(
    keyRaw32: Uint8Array, iv: Uint8Array, ct: Uint8Array, aad?: Uint8Array
): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', buf(keyRaw32), { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv), additionalData: aad && buf(aad) }, key, buf(ct));
    return new Uint8Array(pt);
}

/* base64url helpers (local scope) */
function b64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ub64(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}
