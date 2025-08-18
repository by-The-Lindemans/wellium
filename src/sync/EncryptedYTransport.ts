import * as Y from 'yjs';
import { PeerSession, type WireMsg } from '@crypto/session';
import { b64urlToBytes, bytesToB64url, KeyManager } from '@crypto/KeyManager';
import type { KemProvider } from '@crypto/KeyManager';

/** One-shot bootstrap message that carries the wrapped invitation. */
const MSG_BOOTSTRAP = 'b' as const;
type BootstrapMsg = { t: typeof MSG_BOOTSTRAP; p: string };

const ROTATE_EVERY_UPDATES = 500;
const ROTATE_EVERY_MS = 5 * 60_000;

/** Wraps y-webrtc with per-peer KEM + AES-GCM, plus initial bootstrap. */
export class EncryptedYTransport {
    private peers = new Map<string, {
        peer: any;
        session: PeerSession;
        established: boolean;
        sealedCount: number;
        rotateTimer?: any;
    }>();
    private peerScanTimer?: any;
    private bootstrapSent = false;
    private onDocUpdate = (u: Uint8Array) => this.broadcastUpdate(u);

    constructor(
        private readonly provider: any,             // WebrtcProvider (dummy doc)
        private readonly realDoc: Y.Doc,            // actual Y doc
        private readonly kem: KemProvider,          // KEM provider (Kyber/ECDH)
        private readonly myKemSkB64: string,        // our static SK (b64)
        private readonly theirKemPkB64: string | undefined, // may be undefined on responder
        private readonly km: KeyManager,
        private readonly pairingSecretB64: string,
        private readonly isBootstrapSender: boolean,
        private readonly onReady?: () => void,
    ) { }

    start() {
        this.realDoc.on('update', this.onDocUpdate);
        this.hookExistingPeers();
        this.observePeerChanges();
    }
    stop() {
        this.realDoc.off('update', this.onDocUpdate);
        if (this.peerScanTimer) clearInterval(this.peerScanTimer);
        for (const e of this.peers.values()) {
            try { e.peer.off('data', this.onData); } catch { /* ignore */ }
            if (e.rotateTimer) clearTimeout(e.rotateTimer);
        }
        this.peers.clear();
    }

    /* ---------------- outbound ---------------- */
    private async broadcastUpdate(update: Uint8Array) {
        for (const [id, e] of this.peers.entries()) {
            if (!e.established) continue;
            try {
                const msg = await e.session.sealUpdate(update);
                e.peer.send(JSON.stringify(msg));
                e.sealedCount++;
                if (e.sealedCount >= ROTATE_EVERY_UPDATES) {
                    e.sealedCount = 0;
                    this.rotatePeer(id).catch(() => { });
                }
            } catch { /* ignore */ }
        }
    }

    private scheduleRotate(id: string) {
        const e = this.peers.get(id); if (!e) return;
        if (e.rotateTimer) clearTimeout(e.rotateTimer);
        e.rotateTimer = setTimeout(() => this.rotatePeer(id).catch(() => { }), ROTATE_EVERY_MS);
    }

    private async rotatePeer(id: string) {
        const e = this.peers.get(id); if (!e || !e.established) return;
        try {
            const hs2 = await e.session.initiatorEncap();
            e.peer.send(JSON.stringify({ ...hs2, from: 'me', to: id }));
            this.scheduleRotate(id);
        } catch { /* ignore */ }
    }

    /* ---------------- inbound ---------------- */
    private onData = async (raw: ArrayBuffer | Uint8Array | string) => {
        try {
            const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer);
            const msg = JSON.parse(text) as WireMsg | BootstrapMsg;

            // Bootstrap payload: encrypted invitation
            if ((msg as any).t === MSG_BOOTSTRAP) {
                const b64 = (msg as any).p as string;
                const ct = b64urlToBytes(b64);
                // open with any established peer session
                for (const e of this.peers.values()) if (e.established) {
                    const pt = await e.session.open(ct);
                    const invitationB64 = new TextDecoder().decode(pt);
                    const secret = await this.km.importInvitationFromPeer(invitationB64);
                    localStorage.setItem('wellium/pairing-secret', secret);
                    this.onReady?.();
                    break;
                }
                return;
            }

            // Handshake / updates
            if ((msg as any).t === 'hs1') return; // noop for this bridge
            if ((msg as any).t === 'hs2') {
                for (const [id, e] of this.peers.entries()) {
                    await e.session.responderDecap(msg as any);
                    e.established = true; e.sealedCount = 0; this.scheduleRotate(id);
                    void this.maybeSendBootstrap(e);
                }
                return;
            }
            if ((msg as any).t === 'u') {
                for (const e of this.peers.values()) if (e.established) {
                    const update = await e.session.openUpdate(msg as any);
                    Y.applyUpdate(this.realDoc, update);
                    break;
                }
                return;
            }
        } catch { /* ignore */ }
    };

    private async maybeSendBootstrap(e: { peer: any; session: PeerSession; established: boolean }) {
        if (!this.isBootstrapSender || this.bootstrapSent || !e.established) return;
        try {
            const invitation = await this.km.exportInvitationForPeer(
                this.theirKemPkB64!, this.pairingSecretB64
            );
            const pt = new TextEncoder().encode(invitation);
            const ctBlob = await e.session.seal(pt);
            e.peer.send(JSON.stringify({ t: MSG_BOOTSTRAP, p: bytesToB64url(ctBlob) }));
            this.bootstrapSent = true;
        } catch { /* ignore */ }
    }

    /* ---------------- peer discovery ---------------- */
    private observePeerChanges() {
        // y-webrtc internals vary a bit; polling remains the most stable approach.
        this.peerScanTimer = setInterval(() => this.hookExistingPeers(), 750);
    }

    private hookExistingPeers() {
        // Support both shapes seen across y-webrtc versions.
        const conns: Map<string, any> =
            (this.provider as any).webrtcConns ||
            (this.provider as any).conns ||
            (this.provider as any).room?.webrtcConns ||
            new Map();

        for (const [peerId, conn] of conns) {
            const peer = conn.peer || conn;
            if (!peer || this.peers.has(peerId)) continue;

            const session = new PeerSession(this.kem, this.myKemSkB64, this.theirKemPkB64 as any);
            const entry = { peer, session, established: false, sealedCount: 0, rotateTimer: undefined as any };
            this.peers.set(peerId, entry);

            // Data messages (bootstrap, hs2, updates)
            peer.on('data', this.onData);

            // Clean up on close (prevents ghost peers that never establish)
            const onClose = () => {
                try { peer.off?.('data', this.onData); } catch { }
                if (entry.rotateTimer) clearTimeout(entry.rotateTimer);
                this.peers.delete(peerId);
                // allow a later reconnect to re-run handshake
            };
            peer.once?.('close', onClose);
            peer.once?.('error', onClose);

            // Only initiate if we know their static KEM public key; otherwise stay responder.
            if (!this.theirKemPkB64) continue;

            // Handshake only after the data channel is really open.
            const tryInitiate = async () => {
                if (entry.established) return;
                try {
                    const hs1 = session.makeHs1('me', peerId);
                    peer.send(JSON.stringify(hs1));
                    const hs2 = await session.initiatorEncap();
                    peer.send(JSON.stringify({ ...hs2, from: 'me', to: peerId }));
                    entry.established = true;
                    this.scheduleRotate(peerId);
                    void this.maybeSendBootstrap(entry);
                    // success; no retry needed
                } catch {
                    // Retry once shortly after connect in case simple-peer buffered poorly
                    setTimeout(() => {
                        if (!entry.established) {
                            try {
                                const hs1b = session.makeHs1('me', peerId);
                                peer.send(JSON.stringify(hs1b));
                                session.initiatorEncap().then(hs2b => {
                                    peer.send(JSON.stringify({ ...hs2b, from: 'me', to: peerId }));
                                    entry.established = true;
                                    this.scheduleRotate(peerId);
                                    void this.maybeSendBootstrap(entry);
                                }).catch(() => { });
                            } catch { }
                        }
                    }, 300);
                }
            };

            if (peer.connected === true) {
                // Already open; initiate immediately.
                void tryInitiate();
            } else {
                // Wait for the data channel to open; then initiate.
                peer.once?.('connect', () => void tryInitiate());
            }
        }
    }
}