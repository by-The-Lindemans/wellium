// src/adapters/storageAdapterCapacitor.ts
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { buf, blobToText } from '@crypto/bytes';

const subtle = globalThis.crypto.subtle;

/** Small helpers for BASE64 string <-> Uint8Array */
function toBase64(u8: Uint8Array): string {
  return btoa(String.fromCharCode(...u8));
}
function fromBase64(s: string): Uint8Array {
  const raw = atob(s);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export async function ensureDir(path: string) {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch (e: any) {
    if (e?.code === 'OS-PLUG-FILE-0010') return; // directory already exists
    throw e;
  }
}

type Manifest = { v: 1; next: number };

export class CapacitorStorageAdapter {
  /** secure-storage label for the at-rest AES key */
  static KEY_LABEL = 'wellium/storage-aes-v1';

  /** ---------- Generic encrypted blob API ---------- */

  async saveBlob(keyPath: string, plaintext: Uint8Array): Promise<void> {
    const k = await this.loadCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv: buf(iv) }, k, buf(plaintext));
    const ct = new Uint8Array(ctBuf);

    // layout: [iv || ct] -> BASE64
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv, 0);
    out.set(ct, iv.length);

    const dir = this.dirOf(keyPath);
    if (dir) await ensureDir(dir);

    await Filesystem.writeFile({
      path: keyPath,
      directory: Directory.Data,
      data: toBase64(out),
      recursive: true
    });
  }

  async loadBlob(keyPath: string): Promise<Uint8Array> {
    const res = await Filesystem.readFile({
      path: keyPath,
      directory: Directory.Data,
    });
    const dataStr = typeof res.data === 'string' ? res.data : await blobToText(res.data);
    const all = fromBase64(dataStr);
    if (all.byteLength < 13) throw new Error('corrupt blob');

    const iv = all.slice(0, 12);
    const ct = all.slice(12);

    const k = await this.loadCryptoKey();
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, k, buf(ct));
    return new Uint8Array(pt);
  }

  /** ---------- Yjs update feed (plaintext framing) ---------- */

  async appendChunk(roomId: string, data: Uint8Array): Promise<number> {
    const baseDir = this.roomDir(roomId);
    const manifestPath = `${baseDir}/manifest.json`;
    await ensureDir(baseDir);

    let m: Manifest = { v: 1, next: 0 };
    try {
      const { data } = await Filesystem.readFile({
        path: manifestPath,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      const s = typeof data === 'string' ? data : await blobToText(data);
      m = JSON.parse(s) as Manifest;
      if (m.v !== 1 || !Number.isFinite(m.next)) m = { v: 1, next: 0 };
    } catch {
      // new feed
    }

    const idx = m.next | 0;
    const chunkPath = `${baseDir}/${idx}.bin`;

    await Filesystem.writeFile({
      path: chunkPath,
      directory: Directory.Data,
      data: toBase64(data),
      recursive: true
    });

    m.next = idx + 1;
    await Filesystem.writeFile({
      path: manifestPath,
      directory: Directory.Data,
      data: JSON.stringify(m),
      encoding: Encoding.UTF8,
      recursive: true
    });

    return idx;
  }

  async *iterChunks(roomId: string, opts?: { from?: number }): AsyncGenerator<Uint8Array, void, void> {
    const baseDir = this.roomDir(roomId);
    const manifestPath = `${baseDir}/manifest.json`;

    let m: Manifest;
    try {
      const { data } = await Filesystem.readFile({
        path: manifestPath,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      const s = typeof data === 'string' ? data : await blobToText(data);
      m = JSON.parse(s) as Manifest;
      if (m.v !== 1) return;
    } catch {
      return; // no feed
    }

    const start = Math.max(0, opts?.from ?? 0);
    for (let i = start; i < m.next; i++) {
      const chunkPath = `${baseDir}/${i}.bin`;
      try {
        const res = await Filesystem.readFile({
          path: chunkPath,
          directory: Directory.Data,
        });
        const dataStr = typeof res.data === 'string' ? res.data : await blobToText(res.data);
        yield fromBase64(dataStr);
      } catch {
        // missing chunk; continue
      }
    }
  }

  /** delete by keyPath */
  async remove(keyPath: string): Promise<void> {
    try { await Filesystem.deleteFile({ path: keyPath, directory: Directory.Data }); } catch { }
  }

  /** ---------- internals ---------- */

  private roomDir(roomId: string): string {
    return `yjs/${roomId}`;
  }

  private dirOf(path: string): string {
    const i = path.lastIndexOf('/');
    return i >= 0 ? path.slice(0, i) : '';
  }

  private async loadCryptoKey(): Promise<CryptoKey> {
    try {
      const { value } = await SecureStoragePlugin.get({ key: CapacitorStorageAdapter.KEY_LABEL });
      const raw = Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
      return subtle.importKey('raw', buf(raw), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    } catch {
      const raw = crypto.getRandomValues(new Uint8Array(32));
      await SecureStoragePlugin.set({
        key: CapacitorStorageAdapter.KEY_LABEL,
        value: btoa(String.fromCharCode(...raw))
      });
      return subtle.importKey('raw', buf(raw), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
  }
}
