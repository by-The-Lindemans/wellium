import * as Y from 'yjs';
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { appendUpdateEncrypted, loadAllUpdatesEncrypted } from './yjsStorage';
import { webcrypto } from 'crypto';
import { jest } from '@jest/globals';

jest.mock('@capacitor/filesystem');
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

function newDoc() {
    const doc = new Y.Doc();
    const data = doc.getMap('data');
    return { doc, data };
}

test('encrypts updates at append and restores on load', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const store = new CapacitorStorageAdapter();
    const feed = 'yjs-room-abc';

    // write an update
    const a = newDoc();
    a.doc.transact(() => { a.data.set('bp', 123); });
    const update = Y.encodeStateAsUpdate(a.doc);
    await appendUpdateEncrypted(store, feed, key, update);

    // load into a fresh doc
    const b = newDoc();
    await loadAllUpdatesEncrypted(b.doc, store, feed, key);
    expect(b.data.get('bp')).toBe(123);
});

import { deriveKeysFromSecret, bytesToB64url } from '../crypto/KeyManager';
test('derives stable keys from pairing secret', async () => {
    const secret = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
    const a = await deriveKeysFromSecret(secret);
    const b = await deriveKeysFromSecret(secret);
    expect(a.tag).toBe(b.tag);
    const msg = new TextEncoder().encode('ok');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, a.aes, msg);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, b.aes, ct);
    expect(new TextDecoder().decode(pt)).toBe('ok');
});
