import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSync, generatePairingSecret } from "../sync/SyncProvider";
import QRCode from "qrcode";

export default function PairingScreen() {
    const { status, pairWithSecret } = useSync();
    const [secret, setSecret] = useState<string>("");
    const [mode, setMode] = useState<"host" | "join">("host");
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (mode !== "host") return;
        if (!secret) setSecret(generatePairingSecret());
    }, [mode, secret]);

    useEffect(() => {
        if (mode !== "host" || !secret || !canvasRef.current) return;
        QRCode.toCanvas(canvasRef.current, secret, { width: 220 }).catch(() => { });
    }, [mode, secret]);

    const disabled = status === "connecting" || status === "connected";

    return (
        <div style={{ padding: 16, maxWidth: 480, margin: "40px auto", fontFamily: "system-ui" }}>
            <h2>Pair a device</h2>
            <div style={{ margin: "12px 0" }}>
                <button onClick={() => setMode("host")} disabled={disabled || mode === "host"}>Host</button>
                <button onClick={() => setMode("join")} disabled={disabled || mode === "join"} style={{ marginLeft: 8 }}>Join</button>
            </div>

            {mode === "host" && (
                <div>
                    <p>Show this QR to the other device or copy the code below.</p>
                    <canvas ref={canvasRef} style={{ border: "1px solid #ccc" }} />
                    <pre style={{ userSelect: "all", padding: 8, background: "#f6f6f6" }}>{secret}</pre>
                    <div>
                        <button onClick={() => pairWithSecret(secret)} disabled={disabled}>
                            Use this device with the code
                        </button>
                    </div>
                </div>
            )}

            {mode === "join" && (
                <form onSubmit={(e) => { e.preventDefault(); void pairWithSecret(secret.trim()); }}>
                    <p>Paste the pairing code from your other device.</p>
                    <input
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="paste code"
                        style={{ width: "100%", padding: 8 }}
                    />
                    <div style={{ marginTop: 8 }}>
                        <button type="submit" disabled={disabled || !secret.trim()}>Join</button>
                    </div>
                </form>
            )}
        </div>
    );
}
