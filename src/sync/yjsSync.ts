import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

// Base64URL(SHA-256(bytes)) so the relay never sees a human room name.
export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convenience if you store the secret as base64url in localStorage.
export async function roomTagFromSecretB64(secretB64: string): Promise<string> {
    const b = secretB64.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    const bytes = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
    return sha256Base64Url(bytes);
}

export type YSync = {
    doc: Y.Doc;
    data: Y.Map<any>;
    provider: WebrtcProvider;
    stop: () => void;
};

export async function startYSync(opts: {
    pairingSecret: Uint8Array;     // 32 random bytes from QR
    signalingUrls: string[];
    autoConnect?: boolean;
    maxConns?: number;
}): Promise<YSync> {
    const { pairingSecret, signalingUrls, autoConnect = true, maxConns } = opts;

    const room = await sha256Base64Url(pairingSecret);
    const doc = new Y.Doc();
    const data = doc.getMap('health');

    const provider = new WebrtcProvider(room, doc, {
        signaling: signalingUrls,
        password: pairingSecret,  // hides SDP metadata
        maxConns
    });

    if (!autoConnect) provider.disconnect();

    const stop = () => {
        try { provider.disconnect(); provider.destroy(); } catch { }
        try { doc.destroy(); } catch { }
    };

    return { doc, data, provider, stop };
}

export function onLocalUpdate(doc: Y.Doc, cb: (update: Uint8Array) => void) {
    doc.on('update', (u: Uint8Array) => cb(u));
}

export function applyUpdate(doc: Y.Doc, update: Uint8Array) {
    Y.applyUpdate(doc, update);
}
