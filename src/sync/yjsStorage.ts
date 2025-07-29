import * as Y from "yjs";
import { StorageAdapter } from "../adapters/storageAdapter";

/**
 * Store a sequence of Yjs updates in one encrypted blob using a simple
 * length prefix format: [len(4 LE)] [bytes] repeated.
 */
export async function appendUpdate(
    store: StorageAdapter,
    key: string,
    update: Uint8Array
) {
    const header = new Uint8Array(4);
    new DataView(header.buffer).setUint32(0, update.length, true);

    const chunk = new Uint8Array(4 + update.length);
    chunk.set(header, 0);
    chunk.set(update, 4);

    try {
        const prev = await store.loadBlob(key);
        const merged = new Uint8Array(prev.length + chunk.length);
        merged.set(prev, 0);
        merged.set(chunk, prev.length);
        await store.saveBlob(key, merged);
    } catch {
        await store.saveBlob(key, chunk);
    }
}

/** Read and apply every stored update into the given doc */
export async function loadAllUpdates(
    doc: Y.Doc,
    store: StorageAdapter,
    key: string
) {
    let buf: Uint8Array;
    try {
        buf = await store.loadBlob(key);
    } catch {
        return; // first run; nothing saved yet
    }

    let off = 0;
    while (off + 4 <= buf.length) {
        const view = new DataView(buf.buffer, buf.byteOffset + off, 4);
        const len = view.getUint32(0, true);
        const start = off + 4;
        const end = start + len;
        if (end > buf.length) break;
        const update = buf.slice(start, end);
        Y.applyUpdate(doc, update);
        off = end;
    }
}
