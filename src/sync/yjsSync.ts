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

    // TURN (media relay) (public, rate-limited)
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

// Set to true temporarily to verify TURN works (forces relay-only).
const DEBUG_FORCE_TURN_ONLY = false;

/* ---------- MINIMAL FIX: correct signaling list + preflight ---------- */
/** Official y-webrtc defaults (signaling WebSockets; not STUN/TURN). */
const DEFAULT_SIGNALING: string[] = [
    'wss://y-webrtc-eu.fly.dev',
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
];

/** Optional per-device override; set via DevTools: localStorage.setItem('wl/signal', 'wss://a,wss://b') */
function signalingOverrideFromLocalStorage(): string[] {
    try {
        const s = typeof localStorage !== 'undefined' ? localStorage.getItem('wl/signal') : '';
        if (!s) return [];
        return s.split(',').map((u) => u.trim()).filter(Boolean);
    } catch { return []; }
}

/** Try to open+close a WS for each URL; return the subset that resolves & opens. */
async function preflightSignaling(urls: string[], timeoutMs = 5000): Promise<string[]> {
    const tests = urls.map((url) => new Promise<string | null>((resolve) => {
        let done = false;
        try {
            const ws = new WebSocket(url);
            const to = setTimeout(() => {
                if (!done) { done = true; try { ws.close(); } catch { /* ignore */ }; resolve(null); }
            }, timeoutMs);
            ws.onopen = () => { if (!done) { done = true; clearTimeout(to); try { ws.close(); } catch { }; resolve(url); } };
            ws.onerror = () => { if (!done) { done = true; clearTimeout(to); resolve(null); } };
        } catch { resolve(null); }
    }));
    const results = await Promise.all(tests);
    const ok = results.filter((u): u is string => !!u);

    // preserve original order
    return urls.filter((u) => ok.includes(u));
}
/* -------------------------------------------------------------------- */

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

    // --- MINIMAL FIX APPLIED HERE ---
    // Build candidate signaling list: override > explicit > defaults
    const override = signalingOverrideFromLocalStorage();
    const candidates = (override.length ? override : (signalingUrls?.length ? signalingUrls : DEFAULT_SIGNALING));

    // Probe which ones actually resolve/open on this device; if none, fall back to full list (preserves prior behavior)
    let resolvedSignaling = candidates;
    try {
        const ok = await preflightSignaling(candidates, 5000);
        if (ok.length > 0) resolvedSignaling = ok;
    } catch { /* keep candidates */ }

    const provider = new WebrtcProvider(room, dummyDoc, {
        signaling: resolvedSignaling, // <— only real WS signaling URLs; no STUN here
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

    try {
        // Diagnostics
        const { dlog } = await import('../dev/diag'); // path: src/dev/diag.ts
        dlog('signaling.preflight', { candidates, resolved: resolvedSignaling });
        provider.on('status', (e: any) => dlog('provider.status', { status: e.status }));
        provider.on('synced', (s: any) => dlog('provider.synced', { synced: !!s }));
        (provider as any).on?.('peers', (e: any) => dlog('provider.peers', { added: e.added, removed: e.removed }));
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
