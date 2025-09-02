// src/sync/yjsSync.ts
import * as Y from 'yjs';
import SimplePeer from 'simple-peer';
import { buf } from '@crypto/bytes';
import { dlog } from '../dev/diag';

const log = (...a: any[]) => dlog('lan', ...a);
const slog = (...a: any[]) => dlog('sync', ...a);

export const ROOM_TAG_LEN = 32;

export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(bytes)));
    return btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function roomTagFromSecretB64(secretB64: string): Promise<string> {
    const b = secretB64.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    const bytes = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    return sha256Base64Url(bytes);
}

/* ===== Zeroconf + UDP wrappers (Capacitor or Cordova plugins) ===== */
const ZC = () => (window as any).cordova?.plugins?.zeroconf || null;
const UDP = () => (window as any).chrome?.sockets?.udp || null;

class UdpSock {
    private socketId: number | null = null;
    private recv = (_m: { address: string; port: number; data: Uint8Array }) => { };
    constructor(private port: number, private group = '239.255.0.222') { }

    async bind() {
        const udp = UDP();
        if (!udp) throw new Error('chrome.sockets.udp not available');
        await new Promise<void>((res, rej) => {
            udp.create({}, (createInfo: any) => {
                if (!createInfo) return rej(new Error('udp.create failed'));
                this.socketId = createInfo.socketId;
                udp.bind(this.socketId, '0.0.0.0', this.port, (rc: number) => {
                    if (rc < 0) return rej(new Error('udp.bind failed: ' + rc));
                    udp.joinGroup(this.socketId, this.group, (_rc2: number) => res());
                });
            });
        });
        const onRecv = (info: any) => {
            if (info.socketId !== this.socketId) return;
            const u8 = new Uint8Array(info.data);
            this.recv({ address: info.remoteAddress, port: info.remotePort, data: u8 });
        };
        udp.onReceive.addListener(onRecv);
    }
    onMessage(cb: (m: { address: string; port: number; data: Uint8Array }) => void) {
        this.recv = cb;
    }
    async send(ip: string, port: number, obj: any) {
        const udp = UDP(); if (!udp || this.socketId == null) return;
        const data = new TextEncoder().encode(JSON.stringify(obj));
        await new Promise<void>((res) => udp.send(this.socketId, data.buffer, ip, port, () => res()));
    }
    close() {
        try {
            const udp = UDP(); if (!udp || this.socketId == null) return;
            udp.close(this.socketId, () => { });
            this.socketId = null;
        } catch { }
    }
}

/* ===== Multi-peer LAN mesh provider ===== */

type ConnLike = { peer: SimplePeer.Instance };

export class LanProvider {
    /** Map read by EncryptedYTransport; values expose a `.peer` */
    readonly webrtcConns = new Map<string, ConnLike>();
    /** Alias retained for compatibility with EncryptedYTransport polling logic */
    readonly conns = this.webrtcConns;

    private udp?: UdpSock;
    private myId = Math.floor(Math.random() * 0xffffffff).toString(16);
    private statusCb?: (e: { status: 'connecting' | 'connected' | 'disconnected' }) => void;
    private svcName = '';
    private destroyed = false;
    private forcedRole: 'host' | 'client' | null = null;

    /** peers we are currently handshaking with to avoid duplicate dials */
    private connecting = new Set<string>();
    /** track a minimal directory of seen services */
    private services = new Map<string, { address: string; port: number }>();

    constructor(public doc: Y.Doc, private roomTag: string) {
        // mirror dummy<->real doc to keep plaintext off the wire if you later add a relay
        const dummy = new Y.Doc();
        dummy.on('update', u => Y.applyUpdate(this.doc, u));
        this.doc.on('update', u => Y.applyUpdate(dummy, u));
    }

    on(evt: 'status', cb: (e: { status: 'connecting' | 'connected' | 'disconnected' }) => void) {
        if (evt === 'status') this.statusCb = cb;
    }
    off(evt: 'status') { if (evt === 'status') this.statusCb = undefined; }

    /** Entry point used by startYSync */
    async connect() {
        if (!ZC()) throw new Error('cordova-plugin-zeroconf not available');
        if (!UDP()) throw new Error('chrome.sockets.udp not available');
        this.statusCb?.({ status: 'connecting' });

        // UDP for offer-answer
        this.udp = new UdpSock(53530);
        await this.udp.bind();
        this.udp.onMessage(m => { void this.onUdp(m); });

        const hint = sessionStorage.getItem('wl/force-role');
        if (hint === 'host' || hint === 'client') {
            this.forcedRole = hint;
            try { sessionStorage.removeItem('wl/force-role'); } catch { }
            log('forced role:', this.forcedRole);
        }

        // Always advertise; always watch
        await this.advertise(53530);
        this.watchForever();

        // Keep status up to date
        this.updateStatus();
    }

    disconnect() {
        this.destroyed = true;
        // close all peers
        for (const [peerId, entry] of this.webrtcConns) {
            try { (entry.peer as any).destroy?.(); } catch { }
            this.webrtcConns.delete(peerId);
        }
        // unregister and close plugins
        try { ZC()?.unregister('_wellium._tcp.', 'local.', this.svcName, () => { }, () => { }); } catch { }
        try { ZC()?.close(); } catch { }
        try { this.udp?.close(); } catch { }
        this.statusCb?.({ status: 'disconnected' });
    }
    destroy() { this.disconnect(); }

    /* ---- Advertise and watch ---- */

    private async advertise(port: number) {
        this.svcName = `wl-${this.roomTag.slice(0, 8)}-${this.myId}`;
        const zc = ZC();
        await new Promise<void>((res) => {
            // register(type, domain, name, port, txtRecord, success, fail)
            zc.register('_wellium._tcp.', 'local.', this.svcName, port,
                { room: this.roomTag, id: this.myId }, () => res(), () => res());
        });
    }

    /** Keep a single long-lived watch; connect to new services deterministically */
    private watchForever() {
        const zc = ZC();
        const type = '_wellium._tcp.';
        const domain = 'local.';

        const handleResolved = (svc: any) => {
            if (this.destroyed) return;
            const txt = svc.txtRecord || {};
            if (txt.room !== this.roomTag) return;

            const remoteId = String(txt.id || '');
            if (!remoteId || remoteId === this.myId) return;

            const address = (svc.ipv4Addresses && svc.ipv4Addresses[0]) || (svc.addresses && svc.addresses[0]);
            const port = svc.port;
            if (!address || !port) return;

            this.services.set(remoteId, { address, port });
            const iShouldInitiate =
                this.forcedRole === 'client' ? true :
                    this.forcedRole === 'host' ? false :
                        this.myId.localeCompare(remoteId) < 0;

            log('svc resolved', { name: svc.name, address, port, remoteId, iShouldInitiate, forced: this.forcedRole });

            if (!iShouldInitiate) return;
            if (this.webrtcConns.has(remoteId) || this.connecting.has(remoteId)) return;

            this.connecting.add(remoteId);
            const jitter = 150 + Math.floor(Math.random() * 300);
            setTimeout(() => {
                if (this.destroyed) return;
                const coords = this.services.get(remoteId);
                if (!coords) return;
                log('dialing', remoteId, coords);
                void this.connectAsClient(remoteId, coords.address, coords.port);
            }, jitter);
        };

        const onAdded = (event: any) => {
            if (this.destroyed) return;
            const svc = event?.service;
            if (!svc) return;
            // Always resolve to get IPs on iOS and some Android stacks
            try {
                zc.resolve(type, domain, svc.name, (resolved: any) => handleResolved(resolved?.service || svc));
            } catch {
                handleResolved(svc);
            }
        };

        // Begin watching
        zc.watch(type, domain, (evt: any) => {
            if (evt?.action === 'added') onAdded(evt);
        });
    }


    /* ---- UDP offer-answer protocol ---- */

    private async connectAsClient(remoteId: string, hostIp: string, hostPort: number) {
        this.connecting.add(remoteId);
        const p = new SimplePeer({ initiator: true, trickle: false });
        this.wire(remoteId, p);
        try {
            const offer = await new Promise<any>((resolve, reject) => {
                p.once('signal', resolve);
                p.once('error', reject);
            });
            log('send offer', { to: remoteId, hostIp, hostPort });
            await this.udp!.send(hostIp, hostPort, { v: 1, t: 'offer', room: this.roomTag, id: this.myId, to: remoteId, offer });
        } catch (e) {
            log('offer failed', e);
            try { p.destroy(); } catch { }
            this.webrtcConns.delete(remoteId);
            this.connecting.delete(remoteId);
        }
    }

    private async onUdp(m: { address: string; port: number; data: Uint8Array }) {
        let msg: any;
        try { msg = JSON.parse(new TextDecoder().decode(m.data)); } catch { return; }
        if (!msg || msg.v !== 1 || msg.room !== this.roomTag) return;

        if (msg.t === 'offer') {
            const remoteId = String(msg.id || '');
            if (!remoteId || remoteId === this.myId) return;
            if (this.webrtcConns.has(remoteId)) return;

            log('recv offer', { from: remoteId, addr: m.address, port: m.port });

            const p = new SimplePeer({ initiator: false, trickle: false });
            this.wire(remoteId, p);
            try {
                p.signal(msg.offer);
                const answer = await new Promise<any>((resolve, reject) => {
                    p.once('signal', resolve);
                    p.once('error', reject);
                });
                log('send answer', { to: remoteId, addr: m.address, port: m.port });
                await this.udp!.send(m.address, m.port, { v: 1, t: 'answer', room: this.roomTag, id: this.myId, to: remoteId, answer });
            } catch (e) {
                log('answer failed', e);
                try { p.destroy(); } catch { }
                this.webrtcConns.delete(remoteId);
                this.connecting.delete(remoteId);
            }
            return;
        }

        if (msg.t === 'answer') {
            const remoteId = String(msg.id || msg.from || '');
            if (!remoteId) return;
            const entry = this.webrtcConns.get(remoteId);
            const p = entry?.peer;
            if (!p) return;
            log('recv answer', { from: remoteId });
            try { p.signal(msg.answer); } catch (e) { log('answer signal err', e); }
            return;
        }
    }

    /* ---- Peer wiring and lifecycle ---- */

    private wire(peerId: string, p: SimplePeer.Instance) {
        // publish immediately so EncryptedYTransport can hook before connect
        this.webrtcConns.set(peerId, { peer: p });

        p.on('connect', () => {
            log('rtc connect', peerId);
            this.connecting.delete(peerId);
            this.forcedRole = null; // done with staging hint
            this.updateStatus();
        });
        p.once('close', () => { log('rtc close', peerId); this.webrtcConns.delete(peerId); this.connecting.delete(peerId); this.updateStatus(); });
        p.once('error', (e) => { log('rtc error', peerId, e); this.webrtcConns.delete(peerId); this.connecting.delete(peerId); this.updateStatus(); });
    }

    private updateStatus() {
        if (this.webrtcConns.size > 0) this.statusCb?.({ status: 'connected' });
        else this.statusCb?.({ status: 'connecting' });
    }
}

/* ===== Service facade kept stable ===== */

export type YSync = { doc: Y.Doc; provider: LanProvider; stop: () => void };

export async function startYSync(opts: {
    room: string;
    signalingUrls?: string[]; // ignored on LAN
    autoConnect?: boolean;
}): Promise<YSync> {
    const realDoc = new Y.Doc();
    const provider = new LanProvider(realDoc, opts.room);
    if (opts.autoConnect !== false) { await provider.connect(); }
    const stop = () => provider.destroy();
    return { doc: realDoc, provider, stop };
}

export function onLocalUpdate(doc: Y.Doc, cb: (update: Uint8Array) => void) {
    doc.on('update', (u: Uint8Array) => cb(u));
}
export function applyUpdate(doc: Y.Doc, update: Uint8Array) {
    Y.applyUpdate(doc, update);
}
