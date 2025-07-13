export interface StorageAdapter {
  generateKey(): Promise<string>;       // e.g. create or load a key identifier
  saveBlob(name: string, data: Uint8Array): Promise<void>;
  loadBlob(name: string): Promise<Uint8Array>;
}

// In-memory stub for tests
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, Uint8Array>();

  async generateKey() {
    return crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  }

  async saveBlob(name: string, data: Uint8Array) {
    this.store.set(name, data);
  }

  async loadBlob(name: string) {
    const blob = this.store.get(name);
    if (!blob) throw new Error(`No blob under ${name}`);
    return blob;
  }
}
