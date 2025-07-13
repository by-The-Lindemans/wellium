import * as Automerge from 'automerge';
import {
  newDoc,
  applyLocalChange,
  encodeChanges,
  mergeRemoteChanges
} from 'domain/HealthRecord';

describe('HealthRecord CRDT', () => {
  it('merges a blood-pressure update across two docs', () => {
    const base = newDoc();                                   // common ancestor
    const docB = Automerge.load(Automerge.save(base));       // deep clone
    let   docA = base;

    docA = applyLocalChange(docA, d => {
      d.bloodPressure = 123;
      d.timestamp     = '2025-07-13T00:00:00Z';
    });

    const delta = encodeChanges(docB, docA);
    const merged = mergeRemoteChanges(docB, delta);

    expect(merged.bloodPressure).toBe(123);
    expect(merged.timestamp).toBe('2025-07-13T00:00:00Z');
  });
});
