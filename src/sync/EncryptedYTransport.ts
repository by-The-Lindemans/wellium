// src/sync/EncryptedYTransport.ts (mesh‑aware)
import * as Y from 'yjs';
import { PeerSession, type WireMsg } from '@crypto/session';
import { b64urlToBytes, bytesToB64url, KeyManager } from '@crypto/KeyManager';
import type { KemProvider } from '@crypto/KeyManager';

/* ------------------------------------------------------------------
 * Extra message kind for initial bootstrap
 * t = "b"  –  payload is base64url invitation produced by
 *              KeyManager.exportInvitationForPeer().
 * ------------------------------------------------------------------ */
const MSG_BOOTSTRAP = 'b' as const;
type BootstrapMsg = { t: typeof MSG_BOOTSTRAP; p: string };

const ROTATE_EVERY_UPDATES = 500;
const ROTATE_EVERY_MS = 5 * 60_000;

/* ------------------------------------------------------------------
 * This bridge wraps y-webrtc with per‑peer ML-KEM + AES‑GCM and now
 * pushes a one‑shot bootstrap payload so the camera‑less device does
 * not need to copy JSON manually.
 * ------------------------------------------------------------------ */
export class EncryptedYTransport {
    private peerScanTimer?: any;

    private observePeerChanges() {
        // y-webrtc doesn’t expose a stable event for every lib/vers; poll is fine
        this.peerScanTimer = setInterval(() => this.hookExistingPeers(), 1000);
    }

    private peers = new Map<string, {
        peer: any;
        session: PeerSession;
        established: boolean;
        sealedCount: number;
        rotateTimer?: any;
    }>();
    private onDocUpdate = (u: Uint8Array) => this.broadcastUpdate(u);
    private bootstrapSent = false;

    constructor(
        private readonly provider: any,             // WebrtcProvider (dummy doc)
        private readonly realDoc: Y.Doc,            // actual Y doc
        private readonly kem: KemProvider,          // ML‑KEM provider
        private readonly myKemSkB64: string,        // our static SK (b64)
        private readonly theirKemPkB64: string,     // their static PK (b64)
        /* ---- new params ---- */
        private readonly km: KeyManager,
        private readonly pairingSecretB64: string,
        private readonly isBootstrapSender: boolean,
        private readonly onReady?: () => void,
    ) { }

    /* ---------------- lifecycle ---------------- */
    start() {
        this.realDoc.on('update', this.onDocUpdate);
        this.hookExistingPeers();
        this.observePeerChanges();
    }
    stop() {
        this.realDoc.off('update', this.onDocUpdate);
        if (this.peerScanTimer) clearInterval(this.peerScanTimer);
        for (const e of this.peers.values()) {
            try { e.peer.off('data', this.onData); } catch { }
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
                    e.sealedCount = 0; this.rotatePeer(id).catch(() => { });
                }
            } catch {/* ignore */ }
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
        } catch { }
    }

    /* ---------------- inbound ---------------- */
    private onData = async (raw: ArrayBuffer | Uint8Array | string) => {
        try {
            const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer);
            const msg = JSON.parse(text) as WireMsg | BootstrapMsg;
            if ((msg as any).t === MSG_BOOTSTRAP) {
                const b64 = (msg as any).p as string;
                const ct = b64urlToBytes(b64);
                // open with the *sending* peer's session (any established will do)
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

            /* existing hs/u flow */
            if (msg.t === 'hs1') return; // noop
            if (msg.t === 'hs2') {
                for (const [id, e] of this.peers.entries()) {
                    await e.session.responderDecap(msg);
                    e.established = true; e.sealedCount = 0; this.scheduleRotate(id);
                    // after first establishment we may need to send bootstrap
                    void this.maybeSendBootstrap(e);
                }
                return;
            }
            if (msg.t === 'u') {
                for (const e of this.peers.values()) if (e.established) {
                    const update = await e.session.openUpdate(msg);
                    Y.applyUpdate(this.realDoc, update); break;
                }
                return;
            }
        } catch {/* ignore */ }
    };

    /* ---------------- bootstrap helper ---------------- */
    private async maybeSendBootstrap(e: { peer: any; session: PeerSession; established: boolean }) {
        if (!this.isBootstrapSender || this.bootstrapSent || !e.established) return;
        try {
            const invitation = await this.km.exportInvitationForPeer(this.theirKemPkB64, this.pairingSecretB64);
            const pt = new TextEncoder().encode(invitation);
            const ctBlob = await e.session.seal(pt);
            e.peer.send(JSON.stringify({ t: MSG_BOOTSTRAP, p: bytesToB64url(ctBlob) }));
            this.bootstrapSent = true;
        } catch {/* ignore */ }
    }

    /* ---------------- peer discovery ---------------- */
    private hookExistingPeers() {
        const conns: Map<string, any> = (this.provider as any).webrtcConns || (this.provider as any).conns || new Map();
        for (const [peerId, conn] of conns) {
            const peer = conn.peer || conn;
            if (this.peers.has(peerId)) continue;
            const session = new PeerSession(this.kem, this.myKemSkB64, this.theirKemPkB64);
            const entry = { peer, session, established: false, sealedCount: 0, rotateTimer: undefined as any };
            this.peers.set(peerId, entry);
            peer.on('data', this.onData);
            // initial handshake
            try {
                const hs1 = session.makeHs1('me', peerId); peer.send(JSON.stringify(hs1));
                session.initiatorEncap().then(hs2 => {
                    peer.send(JSON.stringify({ ...hs2, from: 'me', to: peerId }));
                    entry.established = true; this.scheduleRotate(peerId);
                    void this.maybeSendBootstrap(entry);
                }).catch(() => { });
            } catch { }
        }
    }
}
