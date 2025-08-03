import React from "react";
import { useSync } from "../sync/SyncProvider";

export default function ConnectionBanner() {
    const { status, error } = useSync();
    if (status === 'connected') return null;

    const msg =
        status === 'hydrating' ? 'Restoring local state'
            : status === 'connecting' ? 'Connecting to peers'
                : status === 'error' ? `Sync error: ${error ?? 'unknown'}`
                    : 'Waiting to pair';

    return (
        <div
            style={{
                position: 'fixed',    /* <-- key change */
                top: 0,
                insetInline: 0,       /* ltr/rtl-safe “left:0; right:0” */
                zIndex: 2000,
                padding: 8,
                background: '#fff8d1',
                borderBottom: '1px solid #eedc82',
                color: '#5c4a00',
            }}
        >
            {msg}
        </div>
    );
}
