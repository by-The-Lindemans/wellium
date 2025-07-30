import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { StorageAdapter } from './storageAdapter';


const ROOT_DIR = 'wellium';              // app-private root for our blobs
const PAD = 12;                          // 000000000000.bin supports many chunks

function safeKey(s: string): string {
  return s.replace(/[^a-z0-9_-]/gi, '_');
}

function toBase64(u8: Uint8Array): string {
  // Capacitor Filesystem wants base64 strings when encoding=BASE64
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function ensureDir(path: string) {
  await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true }).catch(() => { });
}

type Manifest = { v: 1; next: number };

async function readManifest(feedDir: string): Promise<Manifest> {
  const path = `${feedDir}/manifest.json`;
  try {
    const { data } = await Filesystem.readFile({
      path, directory: Directory.Data, encoding: Encoding.UTF8
    });
    const m = JSON.parse(data as string) as Manifest;
    if (m && typeof m.next === 'number') return m;
  } catch { }
  return { v: 1, next: 0 };
}

async function writeManifest(feedDir: string, m: Manifest): Promise<void> {
  const path = `${feedDir}/manifest.json`;
  await Filesystem.writeFile({
    path, directory: Directory.Data, encoding: Encoding.UTF8,
    data: JSON.stringify(m)
  });
}

/**
 * StorageAdapter implementation that works on any Capacitor‑powered platform.
 * Files are AES‑GCM‑encrypted with a 256‑bit key kept in the device’s
 * secure enclave / KeyChain / KeyStore.
 */
export class CapacitorStorageAdapter implements StorageAdapter {
  private static readonly KEY_LABEL = 'wellium‑aes‑key';

  /** load existing key or create a new 256‑bit random key */
  async generateKey(): Promise<string> {
    const { value: existing } = await SecureStoragePlugin.keys();
    if (existing.includes(CapacitorStorageAdapter.KEY_LABEL)) {
      return CapacitorStorageAdapter.KEY_LABEL;
    }
    const raw = crypto.getRandomValues(new Uint8Array(32));
    await SecureStoragePlugin.set({
      key: CapacitorStorageAdapter.KEY_LABEL,
      value: btoa(String.fromCharCode(...raw))
    });
    return CapacitorStorageAdapter.KEY_LABEL;
  }

  /** encrypt and persist the blob */
  async saveBlob(name: string, data: Uint8Array): Promise<void> {
    const cipher = await this.encrypt(data);
    await Filesystem.writeFile({
      path: `${name}.bin`,
      data: btoa(String.fromCharCode(...cipher)),
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
  }

  /** load, decrypt and return the blob */
  async loadBlob(name: string): Promise<Uint8Array> {
    const { data } = await Filesystem.readFile({
      path: `${name}.bin`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    const cipher = Uint8Array.from(atob(data), ch => ch.charCodeAt(0));
    return this.decrypt(cipher);
  }

  async appendChunk(keyName: string, data: Uint8Array): Promise<number> {
    const feedDir = `${ROOT_DIR}/${safeKey(keyName)}`;
    await ensureDir(feedDir);

    // load or initialize manifest
    let man = await readManifest(feedDir);
    const idx = man.next;

    // write chunk as fixed-width number filename
    const fname = `${String(idx).padStart(PAD, '0')}.bin`;
    await Filesystem.writeFile({
      path: `${feedDir}/${fname}`,
      directory: Directory.Data,
      data: toBase64(data),
      encoding: Encoding.BASE64,
      recursive: true
    });

    // bump manifest
    man = { v: 1, next: idx + 1 };
    await writeManifest(feedDir, man);
    return idx;
  }

  /** Iterate all chunks in order; set options.from to start at a specific index. */
  async *iterChunks(
    keyName: string,
    options?: { from?: number }
  ): AsyncGenerator<Uint8Array, void, void> {
    const feedDir = `${ROOT_DIR}/${safeKey(keyName)}`;

    // Read directory; if missing, treat as empty feed
    let entries: { name: string; type: 'file' | 'directory' }[] = [];
    try {
      const dir = await Filesystem.readdir({ path: feedDir, directory: Directory.Data });
      entries = dir.files as any; // Filesystem Web returns {name,type} objects
    } catch {
      return;
    }

    // Keep only .bin files; sort lexicographically which equals numeric because of padding
    const files = entries
      .filter(e => e.type !== 'directory' && /\.bin$/i.test(e.name))
      .map(e => e.name)
      .sort();

    const startName = options?.from != null
      ? `${String(options.from).padStart(PAD, '0')}.bin`
      : null;

    for (const name of files) {
      if (startName && name < startName) continue;
      const { data } = await Filesystem.readFile({
        path: `${feedDir}/${name}`,
        directory: Directory.Data
      });
      yield fromBase64(data as string);
    }
  }

  /* ——— helpers ——— */
  private async loadCryptoKey(): Promise<CryptoKey> {
    const { value } = await SecureStoragePlugin.get({
      key: CapacitorStorageAdapter.KEY_LABEL
    });
    const raw = Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private async encrypt(clear: Uint8Array): Promise<Uint8Array> {
    const key = await this.loadCryptoKey();
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const ct  = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, clear));
    return new Uint8Array([...iv, ...ct]);
  }

  private async decrypt(payload: Uint8Array): Promise<Uint8Array> {
    const iv  = payload.slice(0, 12);
    const ct  = payload.slice(12);
    const key = await this.loadCryptoKey();
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new Uint8Array(clear);
  }

  async clearFeed(keyName: string): Promise<void> {
    const feedDir = `${ROOT_DIR}/${safeKey(keyName)}`;
    await Filesystem.rmdir({ path: feedDir, directory: Directory.Data, recursive: true }).catch(() => { });
  }

}
