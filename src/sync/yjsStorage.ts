import * as Y from "yjs";
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';



async function encryptAtRest(key: CryptoKey, u: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, u));
  const out = new Uint8Array(iv.byteLength + ct.byteLength);
  out.set(iv, 0);
  out.set(ct, iv.byteLength);
  return out;
}
async function decryptAtRest(key: CryptoKey, blob: Uint8Array): Promise<Uint8Array> {
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

export async function appendUpdateEncrypted(
    store: CapacitorStorageAdapter,
    feedKey: string,
    key: CryptoKey,
    u: Uint8Array
) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, u));
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv, 0); out.set(ct, iv.length);
    await store.appendChunk(feedKey, out);
}

export async function loadAllUpdatesEncrypted(
    doc: Y.Doc,
    store: CapacitorStorageAdapter,
    feedKey: string,
    key: CryptoKey,
    from?: number
) {
    for await (const chunk of store.iterChunks(feedKey, { from })) {
        const iv = chunk.slice(0, 12);
        const ct = chunk.slice(12);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        Y.applyUpdate(doc, new Uint8Array(pt));
    }
}

/**
 * Store a sequence of Yjs updates in one encrypted blob using a simple
 * length prefix format: [len(4 LE)] [bytes] repeated.
 */
export async function appendUpdate(
    store: CapacitorStorageAdapter,
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
    store: CapacitorStorageAdapter,
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
