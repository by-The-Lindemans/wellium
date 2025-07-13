import * as Automerge from 'automerge';

/** -------------------------------------------------
 *  Minimal Health-record CRDT we will expand later
 *  ------------------------------------------------*/
export interface HealthRecord {
  bloodPressure: number;          // systolic value
  timestamp: string;              // ISO-8601
}

/** fresh blank document */
export function newDoc(): Automerge.Doc<HealthRecord> {
  return Automerge.from<HealthRecord>({
    bloodPressure: 0,
    timestamp: new Date().toISOString()
  });
}

/** mutate locally */
export function applyLocalChange(
  doc: Automerge.Doc<HealthRecord>,
  fn: (d: Automerge.Mutable<HealthRecord>) => void
): Automerge.Doc<HealthRecord> {
  return Automerge.change(doc, fn);
}

/** changes to send over the wire */
export function encodeChanges(
  base: Automerge.Doc<HealthRecord>,
  updated: Automerge.Doc<HealthRecord>
): Uint8Array[] {
  return Automerge.getChanges(base, updated);
}

/** merge remote changes */
export function mergeRemoteChanges(
  doc: Automerge.Doc<HealthRecord>,
  changes: Uint8Array[]
): Automerge.Doc<HealthRecord> {
  return Automerge.applyChanges(doc, changes);
}
