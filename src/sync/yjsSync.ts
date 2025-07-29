import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

/** Base64URL(SHA-256(bytes)) so the relay never sees a human room name */
export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return btoa(String.fromCharCode(...digest))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export type YSync = {
    doc: Y.Doc;
    data: Y.Map<any>;
    provider: WebrtcProvider;
    stop: () => void;
};

/** Start Yjs with y-webrtc. The secret comes from QR pairing. */
export async function startYSync(opts: {
    pairingSecret: Uint8Array;
    signalingUrls: string[];          // e.g. ["wss://relay.example.com/peerjs"]
    autoConnect?: boolean;
    maxConns?: number;                // optional cap
}): Promise<YSync> {
    const { pairingSecret, signalingUrls, autoConnect = true, maxConns } = opts;

    const room = await sha256Base64Url(pairingSecret);
    const doc = new Y.Doc();
    const data = doc.getMap("health");

    const provider = new WebrtcProvider(room, doc, {
        signaling: signalingUrls,
        password: pairingSecret,        // hides metadata on the wire
        maxConns
    });

    if (!autoConnect) provider.disconnect();

    const stop = () => {
        try { provider.disconnect(); provider.destroy(); } catch { }
        try { doc.destroy(); } catch { }
    };

    return { doc, data, provider, stop };
}

/** Listen for local updates so you can persist them */
export function onLocalUpdate(doc: Y.Doc, cb: (update: Uint8Array) => void) {
    doc.on("update", (u: Uint8Array) => cb(u));
}

/** Apply a received or restored binary update */
export function applyUpdate(doc: Y.Doc, update: Uint8Array) {
    Y.applyUpdate(doc, update);
}
