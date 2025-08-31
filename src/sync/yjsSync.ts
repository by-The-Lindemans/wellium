// src/sync/yjsSync.ts
import * as Y from 'yjs';
import SimplePeer from 'simple-peer';
import { buf } from '@crypto/bytes';

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

/* ===== Zeroconf + UDP wrappers (Cordova plugins) ===== */
const ZC = () => (window.cordova && window.cordova.plugins && window.cordova.plugins.zeroconf) || null;
const UDP = () => (window.chrome && window.chrome.sockets && window.chrome.sockets.udp) || null;

class UdpSock {
    private socketId: number | null = null;
    private recv = (m: { address: string; port: number; data: Uint8Array }) => { };
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
                    udp.joinGroup(this.socketId, this.group, (rc2: number) => {
                        // ignore rc2 errors; multicast join may fail on some nets
                        res();
                    });
                });
            });
        });
        const onRecv = (info: any) => {
            if (info.socketId !== this.socketId) return;
            const data = new Uint8Array(info.data);
            this.recv({ address: info.remoteAddress, port: info.remotePort, data });
        };
        UDP().onReceive.addListener(onRecv);
    }
    onMessage(cb: (m: { address: string; port: number; data: Uint8Array }) => void) { this.recv = cb; }
    async send(address: string, port: number, payload: any) {
        const enc = new TextEncoder().encode(typeof payload === 'string' ? payload : JSON.stringify(payload));
        await new Promise<void>((res, rej) => {
            UDP().send(this.socketId, enc.buffer, address, port, (sendInfo: any) => {
                if (sendInfo.resultCode < 0) rej(new Error('udp.send failed: ' + sendInfo.resultCode));
                else res();
            });
        });
    }
    async close() {
        try { UDP().close(this.socketId); } catch { }
    }
}

type ConnLike = { peer: SimplePeer.Instance };

class LanProvider {
    readonly webrtcConns = new Map<string, ConnLike>();
    readonly conns = this.webrtcConns; // alias for EncryptedYTransport
    private p?: SimplePeer.Instance;
    private udp?: UdpSock;
    private myId = Math.floor(Math.random() * 0xffffffff).toString(16);
    private statusCb?: (e: { status: 'connecting' | 'connected' | 'disconnected' }) => void;
    private svcName = '';
    private destroyed = false;
    private role: 'host' | 'client' | 'idle' = 'idle';

    constructor(public doc: Y.Doc, private roomTag: string) {
        // mirror dummy<->real doc to keep plaintext out of the wire if you want
        const dummy = new Y.Doc();
        dummy.on('update', u => Y.applyUpdate(this.doc, u));
        this.doc.on('update', u => Y.applyUpdate(dummy, u));
    }

    on(evt: 'status', cb: (e: { status: 'connecting' | 'connected' | 'disconnected' }) => void) {
        if (evt === 'status') this.statusCb = cb;
    }
    off(evt: 'status') { if (evt === 'status') this.statusCb = undefined; }

    async connect() {
        if (!ZC()) throw new Error('cordova-plugin-zeroconf not available');
        this.statusCb?.({ status: 'connecting' });

        this.udp = new UdpSock(53530);
        await this.udp.bind();
        this.udp.onMessage((m) => this.onUdp(m).catch(() => { }));

        const host = await this.findHost(1200);
        if (host) {
            this.role = 'client';
            await this.connectAsClient(host.address, host.port);
            return;
        }
        this.role = 'host';
        await this.startAsHost();
    }

    disconnect() {
        this.destroyed = true;
        try { this.p?.destroy(); } catch { }
        this.webrtcConns.clear();
        try { ZC().unregister('_wellium._tcp.', 'local.', this.svcName, () => { }, () => { }); } catch { }
        try { ZC().close(); } catch { }
        try { this.udp?.close(); } catch { }
        this.statusCb?.({ status: 'disconnected' });
    }
    destroy() { this.disconnect(); }

    private async findHost(ms: number): Promise<{ address: string; port: number } | null> {
        const zc = ZC();
        const found: Array<{ address: string; port: number; id: string }> = [];
        await new Promise<void>((res) => {
            zc.watch('_wellium._tcp.', 'local.', (event: any) => {
                if (event.action !== 'added') return;
                const svc = event.service || {};
                const txt = svc.txtRecord || {};
                if (txt.room !== this.roomTag) return;
                const address = (svc.ipv4Addresses && svc.ipv4Addresses[0]) || (svc.addresses && svc.addresses[0]);
                if (!address || !svc.port) return;
                found.push({ address, port: svc.port, id: txt.id || 'ffff' });
            });
            setTimeout(() => res(), ms);
        });
        try { zc.unwatch('_wellium._tcp.', 'local.', () => { }, () => { }); } catch { }
        if (!found.length) return null;
        found.sort((a, b) => a.id.localeCompare(b.id));
        return { address: found[0].address, port: found[0].port };
    }

    private async advertise(port: number) {
        this.svcName = `wl-${this.roomTag.slice(0, 8)}-${this.myId}`;
        const zc = ZC();
        // Older API: register(type, domain, name, port, txtRecord, success, fail)
        await new Promise<void>((res) => {
            zc.register('_wellium._tcp.', 'local.', this.svcName, port,
                { room: this.roomTag, id: this.myId },
                () => res(),
                () => res()
            );
        });
    }

    private async startAsHost() {
        await this.advertise(53530);
        // Host waits for {t:'offer'} on UDP. onUdp() will reply with answer.
    }

    private async connectAsClient(hostIp: string, hostPort: number) {
        const p = new SimplePeer({ initiator: true, trickle: false });
        this.wire(p);
        const offer = await new Promise<any>((resolve, reject) => {
            p.once('signal', resolve);
            p.once('error', reject);
        });
        await this.udp!.send(hostIp, hostPort, { v: 1, t: 'offer', room: this.roomTag, id: this.myId, offer });
    }

    private async onUdp(m: { address: string; port: number; data: Uint8Array }) {
        let msg: any;
        try { msg = JSON.parse(new TextDecoder().decode(m.data)); } catch { return; }
        if (!msg || msg.v !== 1 || msg.room !== this.roomTag) return;

        if (msg.t === 'offer' && this.role === 'host') {
            const p = new SimplePeer({ initiator: false, trickle: false });
            this.wire(p);
            p.signal(msg.offer);
            const answer = await new Promise<any>((resolve, reject) => {
                p.once('signal', resolve);
                p.once('error', reject);
            });
            await this.udp!.send(m.address, m.port, { v: 1, t: 'answer', room: this.roomTag, id: this.myId, answer });
            return;
        }

        if (msg.t === 'answer' && this.role === 'client' && this.p) {
            this.p.signal(msg.answer);
            return;
        }
    }

    private wire(p: SimplePeer.Instance) {
        this.p = p;
        p.on('connect', () => {
            this.webrtcConns.set('peer-0', { peer: p });
            this.statusCb?.({ status: 'connected' });
        });
        const down = () => {
            this.webrtcConns.clear();
            this.statusCb?.({ status: 'disconnected' });
        };
        p.on('close', down);
        p.on('error', down);
    }
}

export type YSync = { doc: Y.Doc; provider: LanProvider; stop: () => void };

export async function startYSync(opts: {
    room: string;
    signalingUrls?: string[]; // ignored on LAN
    autoConnect?: boolean;    // provider connects immediately
}): Promise<YSync> {
    const realDoc = new Y.Doc();
    const provider = new LanProvider(realDoc, opts.room);
    await provider.connect();
    const stop = () => provider.destroy();
    return { doc: realDoc, provider, stop };
}

export function onLocalUpdate(doc: Y.Doc, cb: (update: Uint8Array) => void) {
    doc.on('update', (u: Uint8Array) => cb(u));
}
export function applyUpdate(doc: Y.Doc, update: Uint8Array) {
    Y.applyUpdate(doc, update);
}
