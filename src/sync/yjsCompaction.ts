import * as Y from "yjs";
import { CapacitorStorageAdapter } from "../adapters/storageAdapterCapacitor";
import { appendUpdate, loadAllUpdates } from "./yjsStorage";

export async function snapshot(doc: Y.Doc): Promise<Uint8Array> {
    return Y.encodeStateAsUpdate(doc);
}

export async function compactIfLarge(
    doc: Y.Doc,
    store: CapacitorStorageAdapter,
    key: string,
    maxBytes = 8 * 1024 * 1024
) {
    try {
        const buf = await store.loadBlob(key);
        if (buf.length < maxBytes) return;
    } catch {
        return;
    }
    const snap = await snapshot(doc);
    // reset log to snapshot
    await store.saveBlob(key, snap);
}

export async function sealDay(
    doc: Y.Doc,
    store: CapacitorStorageAdapter,
    ledgerKey: string,
    signer: (bytes: Uint8Array) => Promise<Uint8Array>
) {
    const snap = await snapshot(doc);
    const prev = await safeLoad(store, ledgerKey);
    const chain = concat(prev, snap);
    const sig = await signer(chain);
    const record = concat(chain, sig);
    await store.saveBlob(ledgerKey, record);
}

async function safeLoad(store: CapacitorStorageAdapter, key: string): Promise<Uint8Array> {
    try { return await store.loadBlob(key); } catch { return new Uint8Array(); }
}
function concat(a: Uint8Array, b: Uint8Array) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
}
