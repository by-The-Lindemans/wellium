import * as Y from 'yjs';

describe('Yjs convergence', () => {
    it('merges concurrent edits on a shared map', () => {
        const a = new Y.Doc();
        const b = new Y.Doc();
        const ma = a.getMap('health');
        const mb = b.getMap('health');
        const ua: Uint8Array[] = [];
        const ub: Uint8Array[] = [];
        a.on('update', (u: Uint8Array) => ua.push(u));
        b.on('update', (u: Uint8Array) => ub.push(u));
        ma.set('bloodPressure', 120);
        mb.set('bloodPressure', 121);
        for (const u of ua) Y.applyUpdate(b, u);
        for (const u of ub) Y.applyUpdate(a, u);
        expect(ma.get('bloodPressure')).toBe(mb.get('bloodPressure'));
    });
});
