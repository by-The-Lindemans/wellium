import { MemoryStorageAdapter } from './storageAdapter';

describe('MemoryStorageAdapter', () => {
  it('saves and loads a blob correctly', async () => {
    const adapter = new MemoryStorageAdapter();
    const data = new Uint8Array([10, 20, 30]);
    await adapter.saveBlob('test', data);
    const loaded = await adapter.loadBlob('test');
    expect(loaded).toEqual(data);
  });

  it('generateKey returns a valid hex string', async () => {
    const adapter = new MemoryStorageAdapter();
    const key = await adapter.generateKey();
    expect(typeof key).toBe('string');
    expect(key).toMatch(/^[0-9a-f]+$/);
    expect(key.length).toBeGreaterThan(0);
  });

  it('throws when loading a non-existent blob', async () => {
    const adapter = new MemoryStorageAdapter();
    await expect(adapter.loadBlob('missing')).rejects.toThrow('No blob under missing');
  });
});
