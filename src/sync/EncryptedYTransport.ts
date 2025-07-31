// src/sync/EncryptedYTransport.ts
import * as Y from 'yjs';
import { PeerSession, type WireMsg } from '../crypto/session';
import { b64urlToBytes, bytesToB64url } from '../crypto/KeyManager';
import type { KemProvider } from '../crypto/KeyManager';

type AnyProvider = any;

const ROTATE_EVERY_UPDATES = 500;     // rotate after 500 sealed updates
const ROTATE_EVERY_MS = 5 * 60_000;   // or 5 minutes, whichever comes first

/**
 * Bridges real Y.Doc to peers by:
 *  - blocking y-webrtc's default plaintext sync (we give it a dummy doc)
 *  - discovering its peer connections
 *  - running a Kyber session handshake per peer
 *  - sealing/opening Y updates via AES-GCM session keys
 */
export class EncryptedYTransport {
    private peers = new Map<string, {
        peer: any,                // SimplePeer instance
        session: PeerSession,     // KEM/HKDF/AES wrapper
        established: boolean,
        sealedCount: number,
        rotateTimer?: any
    }>();

    private onDocUpdate = (update: Uint8Array) => this.broadcastUpdate(update);

    constructor(
        private readonly provider: AnyProvider,      // WebrtcProvider (with dummy doc inside)
        private readonly realDoc: Y.Doc,             // the doc we actually sync
        private readonly kem: KemProvider,           // ML-KEM provider
        private readonly myKemSkB64: string,         // our static SK (b64)
        private readonly theirKemPkB64: string       // their static PK (b64) from IdentityStore
    ) { }

    /** Start: attach doc listener and watch peers */
    start() {
        this.realDoc.on('update', this.onDocUpdate);
        this.hookExistingPeers();
        this.observePeerChanges();
    }


    stop() {
        this.realDoc.off('update', this.onDocUpdate);
        for (const e of this.peers.values()) {
            try { e.peer.off('data', this.onData); } catch { }
            if (e.rotateTimer) clearTimeout(e.rotateTimer);
        }
        this.peers.clear();
    }

    /** Send our Y update to all peers (if session ready) */
    private async broadcastUpdate(update: Uint8Array) {
        for (const [id, e] of this.peers.entries()) {
            if (!e.established) continue;
            try {
                const msg = await e.session.sealUpdate(update);
                e.peer.send(JSON.stringify(msg));
                // rotation counters
                e.sealedCount++;
                if (e.sealedCount >= ROTATE_EVERY_UPDATES) {
                    e.sealedCount = 0;
                    this.rotatePeer(id).catch(() => { });
                }
            } catch {
                // ignore send failures
            }
        }
    }

    private scheduleRotate(id: string) {
        const e = this.peers.get(id);
        if (!e) return;
        if (e.rotateTimer) clearTimeout(e.rotateTimer);
        e.rotateTimer = setTimeout(() => this.rotatePeer(id).catch(() => { }), ROTATE_EVERY_MS);
    }

    /** Initiator sends another hs2 capsule to rekey */
    private async rotatePeer(id: string) {
        const e = this.peers.get(id);
        if (!e || !e.established) return;
        try {
            const hs2 = await e.session.initiatorEncap();
            e.peer.send(JSON.stringify({ ...hs2, from: 'me', to: id }));
            // re-arm time-based rotation
            this.scheduleRotate(id);
        } catch {
            // ignore
        }
    }

    /** Handle any incoming data for a peer (JSON) */
    private onData = async (raw: ArrayBuffer | Uint8Array | string) => {
        try {
            const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer);
            const msg = JSON.parse(text) as WireMsg;

            if (msg.t === 'hs1') {
                // We keep hs1 as a no-op in this simple flow
                return;
            }

            if (msg.t === 'hs2') {
                // Responder decapsulates for both initial handshake and rekey
                for (const [id, e] of this.peers.entries()) {
                    if (e.peer && e.peer._channel && e.peer._channel.readyState === 'open') {
                        await e.session.responderDecap(msg);
                        e.established = true;
                        e.sealedCount = 0;
                        this.scheduleRotate(id);
                    }
                }
                return;
            }

            if (msg.t === 'u') {
                // Decrypt and apply Y update
                for (const e of this.peers.values()) {
                    if (!e.established) continue;
                    const update = await e.session.openUpdate(msg);
                    Y.applyUpdate(this.realDoc, update);
                    break;
                }
                return;
            }
        } catch {
            // ignore parse/decrypt errors
        }
    };

    /** Find a peer entry by id; fallback: first established */
    private entryFromFromId(_from: string) {
        // you can augment with real id routing if you encode peerIds in hs messages
        for (const [id, e] of this.peers) return e;
        return undefined;
    }
    private entryFromAny() {
        for (const e of this.peers.values()) if (e.established) return e;
        return undefined;
    }

    /** Attach to already-connected peers (provider internals) */
    private hookExistingPeers() {
        const conns: Map<string, any> =
            (this.provider as any).webrtcConns || (this.provider as any).conns || new Map();

        for (const [peerId, conn] of conns) {
            const peer = conn.peer || conn;
            if (this.peers.has(peerId)) continue;

            const session = new PeerSession(this.kem, this.myKemSkB64, this.theirKemPkB64);
            const entry = { peer, session, established: false, sealedCount: 0, rotateTimer: undefined as any };
            this.peers.set(peerId, entry);

            peer.on('data', this.onData);

            // Initial handshake: initiator sends hs1 then hs2
            try {
                const hs1 = session.makeHs1('me', peerId);
                peer.send(JSON.stringify(hs1));
                session.initiatorEncap().then(hs2 => {
                    peer.send(JSON.stringify({ ...hs2, from: 'me', to: peerId }));
                    entry.established = true;
                    this.scheduleRotate(peerId);
                }).catch(() => { });
            } catch { }
        }
    }
}