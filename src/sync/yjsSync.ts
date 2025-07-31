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
    doc: Y.Doc;                // REAL doc you use in the app
    provider: WebrtcProvider;  // provider built with a dummy doc
    stop: () => void;
};

export async function startYSync(opts: {
    room: string;
    signalingUrls: string[];
    autoConnect?: boolean;
}): Promise<YSync> {
    const { room, signalingUrls, autoConnect = true } = opts;

    const realDoc = new Y.Doc();
    const dummyDoc = new Y.Doc();            // <- prevents plaintext sync

    const provider = new WebrtcProvider(room, dummyDoc, {
        signaling: signalingUrls,
        // DON'T pass password here; we encrypt at app layer
    });

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
