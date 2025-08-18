// src/sync/yjsSync.ts
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { buf } from '@crypto/bytes';

/** Canonical room-tag length (both sides must slice to the same). */
export const ROOM_TAG_LEN = 32;

/** Base64URL(SHA-256(bytes)) so the relay never sees a human room name. */
export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(bytes)));
    return btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convenience if you store the secret as base64url in localStorage. */
export async function roomTagFromSecretB64(secretB64: string): Promise<string> {
    const b = secretB64.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    const bytes = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
    return sha256Base64Url(bytes);
}

export type YSync = {
    doc: Y.Doc;               // REAL doc you use in the app
    provider: WebrtcProvider; // provider built with a dummy doc
    stop: () => void;
};

/* ---------- ICE servers (FOSS-friendly STUN + public TURN) ---------- */
const ICE_SERVERS: RTCIceServer[] = [
    // STUN (no media relay): Mozilla + Cloudflare
    { urls: ['stun:stun.services.mozilla.com:3478', 'stun:stun.cloudflare.com:3478'] },

    // TURN (media relay) – Open Relay Project (public; rate-limited, no SLA)
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

// Set to true temporarily to verify TURN works (forces relay-only).
const DEBUG_FORCE_TURN_ONLY = false;

export async function startYSync(opts: {
    room: string;
    signalingUrls: string[];  // you already pass this from SyncProvider
    autoConnect?: boolean;
}) {
    const { room, signalingUrls, autoConnect = true } = opts;

    const realDoc = new Y.Doc();
    const dummyDoc = new Y.Doc();
    dummyDoc.on('update', (u) => Y.applyUpdate(realDoc, u));
    realDoc.on('update', (u) => Y.applyUpdate(dummyDoc, u));

    const DEFAULT_SIGNALING = [
        'wss://signaling.yjs.dev'
    ];

    const provider = new WebrtcProvider(room, dummyDoc, {
        signaling: (signalingUrls?.length ? signalingUrls : DEFAULT_SIGNALING),
        peerOpts: {
            config: {
                iceServers: ICE_SERVERS,
                ...(DEBUG_FORCE_TURN_ONLY ? { iceTransportPolicy: 'relay' } : {}),
            },
        },
    });

    try {
        // Minimal awareness breadcrumb
        provider.awareness.setLocalStateField('w', { id: realDoc.clientID, at: Date.now() });
    } catch { }


    let __wlSampler__: any = undefined;
    try {
        if (localStorage.getItem('wl/debug') === '1') {
            __wlSampler__ = setInterval(() => {
                const conns: Map<string, any> =
                    (provider as any).webrtcConns ||
                    (provider as any).conns ||
                    (provider as any).room?.webrtcConns ||
                    new Map();
                const aware = provider.awareness?.getStates?.().size ?? 0;
                // Keep this log concise; you can grep it in the field.
                console.info('[wl.sample]', { aware, conns: Array.from(conns.keys()) });
            }, 1500);
        }
    } catch { /* ignore */ }

    try {
        // Diagnostics
        const { dlog } = await import('../dev/diag'); // path: src/dev/diag.ts
        provider.on('status', (e: any) => dlog('provider.status', { status: e.status }));
        provider.on('synced', (s: any) => dlog('provider.synced', { synced: !!s }));
        // y-webrtc emits a 'peers' event in recent versions
        (provider as any).on?.('peers', (e: any) => dlog('provider.peers', { added: e.added, removed: e.removed }));
        // Awareness changes; count peers
        provider.awareness.on('change', () => {
            const n = provider.awareness.getStates().size;
            dlog('awareness.change', { size: n });
        });
    } catch { }

    // Write a room-proof key into the doc so both sides can confirm the same tag.
    try {
        const sys = realDoc.getMap('sys');
        sys.set(`rt:${room}:${realDoc.clientID}`, { id: realDoc.clientID, at: Date.now() });
    } catch { }

    if (!autoConnect) provider.disconnect();

    const stop = () => {
        try { if (__wlSampler__) clearInterval(__wlSampler__); } catch { }
        try { provider.disconnect(); provider.destroy(); } catch { }
        try { realDoc.destroy(); dummyDoc.destroy(); } catch { }
    };

    return { doc: realDoc, provider, stop };
}

export function onLocalUpdate(doc: Y.Doc, cb: (update: Uint8Array) => void) {
    doc.on('update', (u: Uint8Array) => cb(u));
}

export function applyUpdate(doc: Y.Doc, update: Uint8Array) {
    Y.applyUpdate(doc, update);
}
