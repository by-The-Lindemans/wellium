// src/crypto/identity.ts
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { bytesToB64url, b64urlToBytes } from './KeyManager';
import { buf } from './bytes';

export type PeerIdentity = {
    kemPkB64: string;       // remote Kyber public key (base64url)
    fingerprintB64: string; // short fingerprint for UX & binding
};

const makeKey = (roomTag: string) => `wellium/peer/${roomTag}/kemPk@v1`;

export class IdentityStore {
    constructor(private storage = new CapacitorStorageAdapter()) { }

    async savePeer(roomTag: string, peer: PeerIdentity): Promise<void> {
        const enc = new TextEncoder();
        await this.storage.saveBlob(makeKey(roomTag), enc.encode(JSON.stringify(peer)));
    }

    async loadPeer(roomTag: string): Promise<PeerIdentity | undefined> {
        try {
            const blob = await this.storage.loadBlob(makeKey(roomTag));
            if (!blob) return undefined;
            return JSON.parse(new TextDecoder().decode(blob)) as PeerIdentity;
        } catch {
            return undefined;
        }
    }

    async clearPeer(roomTag: string): Promise<void> {
        try { await this.storage.remove(makeKey(roomTag)); } catch { }
    }
}

export async function kyberFingerprintB64url(pkB64: string): Promise<string> {
    const pk = b64urlToBytes(pkB64);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(pk)));
    return bytesToB64url(digest.slice(0, 10)); // short 80-bit tag for UX
}

export async function revokePeer(roomTag: string) {
    const ids = new IdentityStore();
    await ids.clearPeer(roomTag);
}