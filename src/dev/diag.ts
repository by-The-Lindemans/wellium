// src/dev/diag.ts
type Entry = { t: number; ev: string; kv?: Record<string, any> };

class Diag {
    private buf: Entry[] = [];
    private max = 500;

    enableFromStorage() {
        try {
            if (localStorage.getItem('wl/debug') === '1') (window as any).WL_DIAG = this;
        } catch { }
        return this;
    }

    on(): this { (window as any).WL_DIAG = this; return this; }
    off(): this { if ((window as any).WL_DIAG === this) delete (window as any).WL_DIAG; return this; }

    log(ev: string, kv?: Record<string, any>) {
        const e = { t: Date.now(), ev, kv };
        this.buf.push(e);
        if (this.buf.length > this.max) this.buf.shift();
        // Mirror to console for devtools filtering.
        try { console.info(`[diag] ${ev}`, kv || {}); } catch { }
    }

    entries() { return [...this.buf]; }

    attachPeer(peerId: string, peer: any) {
        this.log('peer.attach', { peerId });
        try {
            peer.once?.('connect', () => this.log('peer.connect', { peerId, sctp: peer._channel?.readyState }));
            peer.once?.('close', () => this.log('peer.close', { peerId }));
            peer.on?.('error', (err: any) => this.log('peer.error', { peerId, err: String(err) }));
            // Try to sample ICE states if simple-peer exposes _pc
            const pc: RTCPeerConnection | undefined = (peer as any)._pc;
            if (pc) {
                this.log('peer.pc.attach', { peerId });
                const sample = async (tag: string) => {
                    try {
                        const stats = await pc.getStats();
                        let pairType = 'unknown';
                        stats.forEach((s: any) => {
                            if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
                                const local = stats.get(s.localCandidateId);
                                const remote = stats.get(s.remoteCandidateId);
                                pairType = `${local?.candidateType || '?'}->${remote?.candidateType || '?'}`;
                            }
                        });
                        this.log(tag, {
                            peerId,
                            ice: pc.iceConnectionState,
                            gather: pc.iceGatheringState,
                            pairType
                        });
                    } catch { }
                };
                pc.addEventListener('iceconnectionstatechange', () => this.log('pc.ice', { peerId, state: pc.iceConnectionState }));
                setTimeout(() => sample('pc.stats.2s'), 2000);
                setTimeout(() => sample('pc.stats.5s'), 5000);
            }
        } catch { }
    }
}

export const diag = new Diag().enableFromStorage();

// Convenience helpers for conditional logging without imports
export function dlog(ev: string, kv?: Record<string, any>) {
    const d: any = (window as any).WL_DIAG;
    if (d?.log) d.log(ev, kv);
}

export function attachPeerIfDiag(peerId: string, peer: any) {
    const d: any = (window as any).WL_DIAG;
    if (d?.attachPeer) d.attachPeer(peerId, peer);
}
