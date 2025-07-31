import { KeyManager } from './src/crypto/KeyManager';

// Node test env: provide atob/btoa if missing
if (typeof (globalThis as any).atob === 'undefined') {
    (globalThis as any).atob = (b64: string) =>
        Buffer.from(b64, 'base64').toString('binary');
}
if (typeof (globalThis as any).btoa === 'undefined') {
    (globalThis as any).btoa = (bin: string) =>
        Buffer.from(bin, 'binary').toString('base64');
}

/** In-memory Filesystem mock that understands Encoding & Directory */
jest.mock('@capacitor/filesystem', () => {
    const files = new Map<string, string>(); // `${directory}:${path}` -> string (BASE64 or UTF8)

    const Directory = { Data: 'DATA' } as const;
    const Encoding = { UTF8: 'UTF8', ASCII: 'ASCII', BASE64: 'BASE64' } as const;

    function keyOf(directory: string, path: string) {
        return `${directory}:${path}`;
    }

    return {
        Directory,
        Encoding,
        Filesystem: {
            async mkdir(_: { path: string; directory: string; recursive?: boolean }) { /* no-op */ },
            async writeFile({ path, directory, data }: { path: string; directory: string; data: string }) {
                files.set(keyOf(directory, path), data);
            },
            async readFile({ path, directory }: { path: string; directory: string; encoding?: string }) {
                const k = keyOf(directory, path);
                if (!files.has(k)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
                return { data: files.get(k)! };
            },
            async readdir({ path, directory }: { path: string; directory: string }) {
                const prefix = keyOf(directory, path.endsWith('/') ? path : path + '/');
                const names = Array.from(files.keys())
                    .filter(k => k.startsWith(prefix))
                    .map(k => k.substring(prefix.length));
                // de-dup immediate children only
                const set = new Set<string>();
                for (const n of names) set.add(n.split('/')[0]);
                return { files: Array.from(set).map(n => ({ name: n })) };
            },
            async deleteFile({ path, directory }: { path: string; directory: string }) {
                files.delete(keyOf(directory, path));
            },
            async stat({ path, directory }: { path: string; directory: string }) {
                const k = keyOf(directory, path);
                if (!files.has(k)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
                return { type: 'file', size: files.get(k)!.length, ctime: Date.now(), mtime: Date.now(), uri: k };
            }
        }
    };
});

/** In-memory secure storage plugin */
jest.mock('capacitor-secure-storage-plugin', () => {
    const store = new Map<string, string>();
    return {
        SecureStoragePlugin: {
            async get({ key }: { key: string }) {
                if (!store.has(key)) throw new Error('Item with given key does not exist');
                return { value: store.get(key)! };
            },
            async set({ key, value }: { key: string; value: string }) { store.set(key, value); return { value: true }; },
            async remove({ key }: { key: string }) { store.delete(key); return { value: true }; },
            async clear() { store.clear(); return { value: true }; }
        }
    };
});

// Ensure there is always a KEM provider for tests (Kyber if available, else ECDH-P256).
beforeAll(async () => {
    await KeyManager.installPreferredKem({ requirePQ: false });
});
