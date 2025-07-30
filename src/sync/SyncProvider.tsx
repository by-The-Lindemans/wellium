import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { startYSync } from "./yjsSync";
import { appendUpdateEncrypted, loadAllUpdatesEncrypted } from "./yjsStorage";
import { CapacitorStorageAdapter } from "../adapters/storageAdapterCapacitor";
import { deriveKeysFromSecret } from "../crypto/KeyManager";

type Status = "idle" | "hydrating" | "connecting" | "connected" | "error";

type SyncCtx = {
    status: Status;
    error?: string;
    ydoc?: Y.Doc;
    ymap?: Y.Map<any>;
    pairWithSecret: (secretB64: string) => Promise<void>;
    disconnect: () => void;
    clearSavedSecret: () => void;
};

const SECRET_KEY = "wellium/pairing-secret";

const SyncContext = createContext<SyncCtx>({
    status: "idle",
    pairWithSecret: async () => { },
    disconnect: () => { },
    clearSavedSecret: () => { }
});

function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}
function bytesToB64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function SyncProvider(props: { signalingUrls: string[]; children: React.ReactNode }) {
    const { signalingUrls, children } = props;

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | undefined>();
    const [ydoc, setYDoc] = useState<Y.Doc | undefined>();
    const [ymap, setYMap] = useState<Y.Map<any> | undefined>();
    const svcRef = useRef<ReturnType<typeof startYSync> | null>(null as any);
    const storage = useMemo(() => new CapacitorStorageAdapter(), []);

    async function hydrateAndConnect(secretBytes: Uint8Array) {
        setStatus("hydrating");
        setError(undefined);

        // derive per-room keys and a stable tag from the same secret
        const secretB64 = bytesToB64url(secretBytes);
        const keys = await deriveKeysFromSecret(secretB64);
        const feedKey = "yjs-" + keys.tag; // local namespace for chunk files

        // start Y and hold provider disconnected until persistence catches up
        const svc = await startYSync({ pairingSecret: secretBytes, signalingUrls, autoConnect: false });
        svcRef.current = Promise.resolve(svc) as any;

        // hydrate from local encrypted feed, then persist subsequent updates
        await loadAllUpdatesEncrypted(svc.doc, storage, feedKey, keys.aes);
        const appendEnc = appendUpdateEncrypted(storage, feedKey, keys.aes);
        svc.doc.on("update", (u: Uint8Array) => { void appendEnc(u); });

        setYDoc(svc.doc);
        setYMap(svc.data);

        setStatus("connecting");
        svc.provider.connect();

        // y-webrtc has limited status; assume connected after a brief tick
        setTimeout(() => setStatus("connected"), 300);
    }

    async function pairWithSecret(secretB64: string) {
        try {
            localStorage.setItem(SECRET_KEY, secretB64);
            await hydrateAndConnect(b64urlToBytes(secretB64));
        } catch (e: any) {
            setError(String(e?.message ?? e));
            setStatus("error");
        }
    }

    function disconnect() {
        const p = svcRef.current as any;
        if (p && typeof p.then === "function") {
            p.then(svc => svc.stop()).catch(() => { });
        }
        setYDoc(undefined);
        setYMap(undefined);
        setStatus("idle");
    }

    function clearSavedSecret() {
        try { localStorage.removeItem(SECRET_KEY); } catch { }
    }

    useEffect(() => {
        const saved = (() => { try { return localStorage.getItem(SECRET_KEY); } catch { return null; } })();
        if (saved) {
            void pairWithSecret(saved);
        }
        return () => disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SyncContext.Provider value={{ status, error, ydoc, ymap, pairWithSecret, disconnect, clearSavedSecret }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    return useContext(SyncContext);
}

/** helper for hosts that want to generate and show a fresh pairing secret */
export function generatePairingSecret(): string {
    const u = new Uint8Array(32);
    crypto.getRandomValues(u);
    return bytesToB64url(u);
}
