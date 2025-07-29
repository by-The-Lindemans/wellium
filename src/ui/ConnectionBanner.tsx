import React from "react";
import { useSync } from "../sync/SyncProvider";

export default function ConnectionBanner() {
    const { status, error } = useSync();
    if (status === "connected") return null;
    const msg =
        status === "hydrating" ? "Restoring local state" :
            status === "connecting" ? "Connecting to peers" :
                status === "error" ? `Sync error: ${error ?? "unknown"}` :
                    "Waiting to pair";
    return (
        <div style={{ padding: 8, background: "#fff8d1", borderBottom: "1px solid #eedc82", color: "#5c4a00" }}>
            {msg}
        </div>
    );
}
