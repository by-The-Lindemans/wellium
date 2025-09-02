import * as Y from 'yjs';
import { PeerSession, type WireMsg } from '@crypto/session';
import { b64urlToBytes, bytesToB64url, KeyManager } from '@crypto/KeyManager';
import type { KemProvider } from '@crypto/KeyManager';
import { dlog } from '../dev/diag';

const log = (...a: any[]) => dlog('lan', ...a);
const slog = (...a: any[]) => dlog('sync', ...a);

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
        /** y-webrtc provider */
        private readonly provider: any,
        /** the real application doc we encrypt/decrypt for */
        private readonly realDoc: Y.Doc,
        /** KEM provider (ECDH or ML-KEM) */
        private readonly kemProvider: KemProvider,
        /** our static secret key (base64url) */
        private readonly myKemSkB64: string,
        /** their static public key (base64url); may be empty if unknown yet */
        private readonly theirKemPkB64: string,
        /** key manager for invitation wrapping/unwrapping */
        private readonly km: KeyManager,
        /** pairing secret used to derive the room tag; travels in the invitation */
        private readonly pairingSecretB64: string,
        /** if true, this side sends the one-shot bootstrap to import keys */
        private readonly isBootstrapSender: boolean,
        /** optional callback invoked after a successful import of the invitation */
        private readonly onReady?: (newSecretB64: string) => void,
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
            try { e.peer.off?.('data', this.onData); } catch { }
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
                if (e.sealedCount % ROTATE_EVERY_UPDATES === 0) this.scheduleRotate(id);
            } catch { /* ignore */ }
        }
    }

    private scheduleRotate(id: string) {
        const e = this.peers.get(id); if (!e) return;
        if (e.rotateTimer) clearTimeout(e.rotateTimer);
        e.rotateTimer = setTimeout(() => { void this.rotatePeer(id); }, ROTATE_EVERY_MS);
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
            const msg: any = JSON.parse(text);

            // Bootstrap invitation
            if ((msg as BootstrapMsg).t === MSG_BOOTSTRAP && typeof (msg as BootstrapMsg).p === 'string') {
                try {
                    const pairingSecret = await this.km.importInvitationFromPeer((msg as BootstrapMsg).p);
                    if (pairingSecret && this.onReady) this.onReady(pairingSecret);
                } catch { /* ignore bad invitation */ }
                return;
            }

            // Handshake
            if ((msg as any).t === 'hs1') return; // announcement; initiator only
            if ((msg as any).t === 'hs2') {
                for (const [id, e] of this.peers.entries()) {
                    try {
                        await e.session.responderDecap(msg as any);
                        e.established = true; e.sealedCount = 0; this.scheduleRotate(id);
                        void this.maybeSendBootstrap(e);
                    } catch { /* not for this session or failed; try others */ }
                }
                return;
            }

            // Encrypted update
            if ((msg as any).t) {
                for (const e of this.peers.values()) {
                    if (!e.established) continue;
                    try {
                        const update = await e.session.openUpdate(msg as WireMsg);
                        if (update && update.byteLength) Y.applyUpdate(this.realDoc, update);
                        return;
                    } catch { /* try next peer session */ }
                }
            }
        } catch { /* ignore malformed */ }
    };

    private async maybeSendBootstrap(entry: { peer: any; session: PeerSession; established: boolean }) {
        if (this.bootstrapSent) return;
        if (!this.isBootstrapSender) return;
        if (!this.theirKemPkB64) return;
        if (!entry.established) return;
        try {
            const payloadB64 = await this.km.exportInvitationForPeer(this.theirKemPkB64, this.pairingSecretB64);
            const m: BootstrapMsg = { t: MSG_BOOTSTRAP, p: payloadB64 };
            entry.peer.send(JSON.stringify(m));
            this.bootstrapSent = true;
        } catch { /* will retry after next rotate */ }
    }

    /* ---------------- peer discovery ---------------- */
    private observePeerChanges() {
        // y-webrtc internals vary; polling is the most stable approach.
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
            const peer = (conn as any).peer || conn;
            if (!peer || this.peers.has(peerId)) continue;

            const session = new PeerSession(this.kemProvider, this.myKemSkB64, this.theirKemPkB64 || '');
            const entry = { peer, session, established: false, sealedCount: 0, rotateTimer: undefined as any };
            this.peers.set(peerId, entry);

            // Inbound
            peer.on?.('data', this.onData);

            // Clean up on close; allow re-discovery on reconnects
            const onClose = () => {
                try { peer.off?.('data', this.onData); } catch { }
                if (entry.rotateTimer) clearTimeout(entry.rotateTimer);
                this.peers.delete(peerId);
            };
            peer.once?.('close', onClose);
            peer.once?.('error', onClose);

            // Initiate only after the data channel is open; retry once shortly after.
            const tryInitiate = async () => {
                if (entry.established) return;
                try {
                    const hs1 = entry.session.makeHs1('me', peerId);
                    peer.send(JSON.stringify(hs1));
                    const hs2 = await entry.session.initiatorEncap();
                    peer.send(JSON.stringify({ ...hs2, from: 'me', to: peerId }));
                    entry.established = true;
                    this.scheduleRotate(peerId);
                    void this.maybeSendBootstrap(entry);
                } catch {
                    setTimeout(async () => {
                        if (entry.established) return;
                        try {
                            const hs1b = entry.session.makeHs1('me', peerId);
                            peer.send(JSON.stringify(hs1b));
                            const hs2b = await entry.session.initiatorEncap();
                            peer.send(JSON.stringify({ ...hs2b, from: 'me', to: peerId }));
                            entry.established = true;
                            this.scheduleRotate(peerId);
                            void this.maybeSendBootstrap(entry);
                        } catch { /* give up; will try again after rediscovery */ }
                    }, 300);
                }
            };

            if ((peer as any).connected === true || (peer as any)._channel?.readyState === 'open') {
                void tryInitiate();
            } else {
                peer.once?.('connect', () => { void tryInitiate(); });
            }
        }
    }
}
