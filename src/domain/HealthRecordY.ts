import * as Y from "yjs";

/** Shared map that holds your health record fields */
export type HealthRecordY = Y.Map<any>;

/** Example accessors you can expand to your schema */
export function getBloodPressure(m: HealthRecordY): number {
    return m.get("bloodPressure") ?? 0;
}
export function setBloodPressure(m: HealthRecordY, value: number) {
    m.set("bloodPressure", value);
}
