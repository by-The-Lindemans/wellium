import { startYSync, sha256Base64Url } from "../sync/yjsSync";
import { loadAllUpdates, appendUpdate } from "../sync/yjsStorage";
import { CapacitorStorageAdapter } from "../adapters/storageAdapterCapacitor";
import { MemoryStorageAdapter } from "../adapters/storageAdapter";

console.log('[yjsDemo] module loaded');

const SECRET_KEY = 'wellium/pairing-secret';

function saveSecret(b64: string) {
    try { localStorage.setItem(SECRET_KEY, b64); } catch { }
}
function readSecret(): string | null {
    try { return localStorage.getItem(SECRET_KEY); } catch { return null; }
}


/** small helpers for console-only testing */
function b64url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}
function randomSecret(): Uint8Array {
    const u = new Uint8Array(32);
    crypto.getRandomValues(u);
    return u;
}

type SyncCtx = Awaited<ReturnType<typeof startYSync>> | null;

let syncA: SyncCtx = null;
let syncB: SyncCtx = null;
let keyA = "";
let keyB = "";

/** pick a store based on runtime */
const store = (window as any).Capacitor ? new CapacitorStorageAdapter() : new MemoryStorageAdapter();

/** derive a stable storage key from the pairing secret */
async function storageKey(secret: Uint8Array) {
    const tag = await sha256Base64Url(secret);
    return "yjs-" + tag.slice(0, 16);
}

/** expose minimal console helpers during dev */
declare global {
    interface Window {
        yHost?: () => Promise<string>;
        yJoin?: (secretB64: string) => Promise<void>;
        yInc?: () => void;
    }
}

/** host a room and print the pairing secret */
window.yHost = async () => {
    const secret = randomSecret();
    const urls = [import.meta.env.VITE_SIGNAL_URL].filter(Boolean) as string[];
    keyA = await storageKey(secret);

    // hydrate from disk before networking
    const { Doc } = await import("yjs");
    const tmp = new Doc();
    await loadAllUpdates(tmp, store, keyA);

    syncA = await startYSync({ pairingSecret: secret, signalingUrls: urls });
    await loadAllUpdates(syncA.doc, store, keyA);
    syncA.doc.on("update", (u: Uint8Array) => { void appendUpdate(store, keyA, u); });

    const secretB64 = b64url(secret);
    saveSecret(secretB64);
    console.log('pairing secret (share as QR):', secretB64);
    return secretB64;
};

/** join a room using the secret */
window.yJoin = async (secretB64: string) => {
    saveSecret(secretB64);
    const secret = fromB64url(secretB64);
    const urls = [import.meta.env.VITE_SIGNAL_URL].filter(Boolean) as string[];
    keyB = await storageKey(secret);

    syncB = await startYSync({ pairingSecret: secret, signalingUrls: urls });
    await loadAllUpdates(syncB.doc, store, keyB);
    syncB.doc.on("update", (u: Uint8Array) => { void appendUpdate(store, keyB, u); });
    console.log("joined");
};

/** bump a field to see live sync and persistence */
window.yInc = () => {
    const ctx = syncA || syncB;
    if (!ctx) { console.warn("not connected"); return; }
    const m = ctx.data;
    const v = (m.get("bloodPressure") ?? 0) + 1;
    m.set("bloodPressure", v);
    console.log("local BP", v);
};

(async () => {
    const saved = readSecret();
    if (saved) {
        try {
            await window.yJoin!(saved);
            console.log('[yjsDemo] auto‑resumed from saved pairing secret');
        } catch (e) {
            console.warn('[yjsDemo] auto‑resume failed', e);
        }
    }
})();
