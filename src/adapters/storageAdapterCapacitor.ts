import { Filesystem, FilesystemDirectory, FilesystemEncoding } from '@capacitor/filesystem';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { StorageAdapter } from './storageAdapter';

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
      directory: FilesystemDirectory.Documents,
      encoding: FilesystemEncoding.UTF8
    });
  }

  /** load, decrypt and return the blob */
  async loadBlob(name: string): Promise<Uint8Array> {
    const { data } = await Filesystem.readFile({
      path: `${name}.bin`,
      directory: FilesystemDirectory.Documents,
      encoding: FilesystemEncoding.UTF8
    });
    const cipher = Uint8Array.from(atob(data), ch => ch.charCodeAt(0));
    return this.decrypt(cipher);
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
}
