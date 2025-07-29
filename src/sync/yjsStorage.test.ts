import * as Y from 'yjs';
import { appendUpdate, loadAllUpdates } from './yjsStorage';
import { MemoryStorageAdapter } from '../adapters/storageAdapter';

describe('yjsStorage framing', () => {
    it('appends and replays updates in order', async () => {
        const store = new MemoryStorageAdapter();
        const key = 'yjs-test';
        const a = new Y.Doc();
        const mA = a.getMap('health');
        const captured: Uint8Array[] = [];
        a.on('update', (u: Uint8Array) => captured.push(u));
        mA.set('bloodPressure', 111);
        mA.set('bloodPressure', 112);
        for (const u of captured) await appendUpdate(store, key, u);
        const b = new Y.Doc();
        await loadAllUpdates(b, store, key);
        const mB = b.getMap('health');
        expect(mB.get('bloodPressure')).toBe(112);
    });
});
