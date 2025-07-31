import { kem } from '../crypto/KeyManager'; // re-use the active provider via registry
import { hkdfExtractExpand } from './hybrid';

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
