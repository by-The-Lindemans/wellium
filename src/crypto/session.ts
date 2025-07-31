import { kem } from './KeyManager'; // re-use the active provider via registry
import { hkdfExtractExpand } from './hybrid';
import { b64urlToBytes, bytesToB64url } from './KeyManager';
import type { KemProvider } from './KeyManager';

export type SessionKey = CryptoKey;  // AES-GCM key (256-bit)

type HandshakeState = 'idle' | 'established' | 'error';

/** HKDF-SHA256 -> 32-byte key material */
async function hkdfToAesKey(ikm: Uint8Array, infoStr: string): Promise<CryptoKey> {
    const salt = new Uint8Array(32); // all-zero salt
    const info = new TextEncoder().encode(infoStr);
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        ikmKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export type WireMsg =
    | { t: 'hs1'; kem: string; to: string; from: string; ephPk?: string } // optional if you extend to eph KEM
    | { t: 'hs2'; kem: string; to: string; from: string; capsule: string }
    | { t: 'u'; iv: string; ct: string };  // encrypted Y update

/** A small per-peer session that performs KEM handshake & encrypts updates. */
export class PeerSession {
    private state: HandshakeState = 'idle';
    private sessionKey?: SessionKey;

    constructor(
        private readonly kem: KemProvider,
        /** Our static Kyber secret key bytes (b64). */
        private readonly myKemSkB64: string,
        /** Their static Kyber public key (b64). */
        private readonly theirKemPkB64: string,
        /** For binding/debug (room id etc.) */
        private readonly contextInfo = 'wellium/rtc/session/v1'
    ) { }

    get established() { return this.state === 'established'; }

    /** A starts: send hs1 (announcement); B replies with hs2 (capsule) */
    makeHs1(fromId: string, toId: string): WireMsg {
        return { t: 'hs1', kem: this.kem.name, from: fromId, to: toId };
    }

    /** On hs1 received by B: generate/encapsulate to A's static PK and reply hs2 */
    async handleHs1(fromId: string, toId: string): Promise<WireMsg> {
        if (this.state !== 'idle') throw new Error('handshake already in progress or done');

        // We (B) encapsulate to *our* static PK or the peer’s? In this simple design:
        // - A announces hs1
        // - B responds hs2 with capsule for B’s *static* secret key (decapsulated by B)
        //   and *shared secret is computed by A* using B’s static public key.
        // To keep symmetry simple, we derive shared at the *initiator* side using peer PK.
        // So B sends capsule derived from B’s static SK & A’s view uses B’s static PK.
        const peerPk = b64urlToBytes(this.theirKemPkB64); // B's view: "their" is A
        // But we want the capsule for A to produce the same shared as A derives by encap(peerPk)
        // KEM APIs vary. To keep both sides same shared:
        // Let the INITIATOR (A) do encapsulation to B's static PK; B decapsulates.
        // Thus our hs1 is only an announcement; hs2 comes from A (see below).
        // => Here we just echo hs1 path; B waits for A's hs2. No action.
        // Return a no-op; we don't produce hs2 here in this version.
        return { t: 'hs1', kem: this.kem.name, from: toId, to: fromId }; // not used, kept for symmetry
    }

    /** A handles hs2 from B: derive sessionKey via decapsulation */
    async handleHs2_fromInitiator(msg: Extract<WireMsg, { t: 'hs2' }>): Promise<void> {
        if (this.state !== 'idle') return;
        const capsule = b64urlToBytes(msg.capsule);
        const sk = b64urlToBytes(this.myKemSkB64); // A's *static* SK? Not needed in our flow.
        // In our "A encapsulates to B static PK" flow, A does NOT decapsulate; A already
        // computed shared at encapsulation time. So this function is a no-op for A.
        // We keep this for completeness if you later switch to a symmetric eph-eph flow.
    }

    /** Produce hs2 (capsule) on the **initiator** (A) side */
    async initiatorEncap(): Promise<WireMsg> {
        // A encapsulates to B's static PK
        const peerPk = b64urlToBytes(this.theirKemPkB64);
        const { capsule, shared } = await this.kem.encapsulate(peerPk);
        this.sessionKey = await hkdfToAesKey(shared, this.contextInfo);
        this.state = 'established';
        return { t: 'hs2', kem: this.kem.name, from: '', to: '', capsule: bytesToB64url(capsule) };
    }

    /** Completes session on **responder** (B) side given hs2 capsule */
    async responderDecap(hs2: Extract<WireMsg, { t: 'hs2' }>): Promise<void> {
        if (this.state !== 'idle') return;
        const capsule = b64urlToBytes(hs2.capsule);
        const sk = b64urlToBytes(this.myKemSkB64);
        const shared = await this.kem.decapsulate(capsule, sk);
        this.sessionKey = await hkdfToAesKey(shared, this.contextInfo);
        this.state = 'established';
    }

    /** Encrypt a Yjs binary update for wire */
    async sealUpdate(update: Uint8Array): Promise<Extract<WireMsg, { t: 'u' }>> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.sessionKey,
            update
        ));
        return { t: 'u', iv: bytesToB64url(iv), ct: bytesToB64url(ct) };
    }

    /** Decrypt a wire update into Yjs update bytes */
    async openUpdate(msg: Extract<WireMsg, { t: 'u' }>): Promise<Uint8Array> {
        if (!this.sessionKey) throw new Error('no session key');
        const iv = b64urlToBytes(msg.iv);
        const ct = b64urlToBytes(msg.ct);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.sessionKey, ct);
        return new Uint8Array(pt);
    }
}

export type KemOffer = {
    v: 1;
    alg: string;         // kem.name
    ct: string;          // base64url ciphertext (capsule)
    salt: string;        // base64url salt (32B)
};

function b64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ub64(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

/** Initiator: encapsulate to peer KEM public key and derive sessionRoot. */
export async function startKemSessionInitiator(peerKemPublicB64: string, context = 'wellium/kem-session/v1') {
    const prov = (kem as any).get?.() ?? (kem as any); // support direct or registry
    const peerPub = ub64(peerKemPublicB64);
    const { shared, capsule } = await prov.encapsulate(peerPub);
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const sessionRoot = await hkdfExtractExpand(shared, salt, new TextEncoder().encode(context), 32);
    const offer: KemOffer = { v: 1, alg: prov.name, ct: b64url(capsule), salt: b64url(salt) };
    return { sessionRoot, offer };
}

/** Responder: decapsulate and derive the same sessionRoot. */
export async function acceptKemSession(myKemSecretB64: string, offer: KemOffer, context = 'wellium/kem-session/v1') {
    const prov = (kem as any).get?.() ?? (kem as any);
    if (offer.alg !== prov.name) throw new Error('KEM alg mismatch');
    const sk = ub64(myKemSecretB64);      // you probably store/load this yourself
    const capsule = ub64(offer.ct);
    const salt = ub64(offer.salt);
    const shared = await prov.decapsulate(capsule, sk);
    const sessionRoot = await hkdfExtractExpand(shared, salt, new TextEncoder().encode(context), 32);
    return { sessionRoot };
}

/* ----------------------- AES-256-GCM helpers ----------------------- */

export async function aesGcmEncrypt(
    keyRaw32: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array
): Promise<{ iv: Uint8Array; ct: Uint8Array }> {
    const key = await crypto.subtle.importKey('raw', keyRaw32, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext));
    return { iv, ct };
}

export async function aesGcmDecrypt(
    keyRaw32: Uint8Array, iv: Uint8Array, ct: Uint8Array, aad?: Uint8Array
): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', keyRaw32, { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ct);
    return new Uint8Array(pt);
}

/** Derive per-epoch and per-chunk keys from sessionRoot via HKDF (deterministic). */
export async function deriveEpochKey(sessionRoot: Uint8Array, roomTag: string, epoch: number) {
    const info = new TextEncoder().encode(`wellium/epoch/v1|${roomTag}|${epoch}`);
    return hkdfExtractExpand(sessionRoot, new Uint8Array(32), info, 32);
}

export async function deriveChunkKey(epochKey: Uint8Array, seq: number) {
    const info = new TextEncoder().encode(`wellium/chunk/v1|${seq}`);
    return hkdfExtractExpand(epochKey, new Uint8Array(32), info, 32);
}
