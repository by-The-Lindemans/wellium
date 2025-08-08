import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { startYSync, sha256Base64Url } from "./yjsSync";
import { appendUpdateEncrypted, loadAllUpdatesEncrypted } from "./yjsStorage";
import { CapacitorStorageAdapter } from "../adapters/storageAdapterCapacitor";
import { deriveKeysFromSecret } from "@crypto/KeyManager";
import { EncryptedYTransport } from './EncryptedYTransport';
import { IdentityStore } from '@crypto/identity';
import { KeyManager } from '@crypto/KeyManager';

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
        const feedKey = "yjs-" + keys.tag;

        const tag = await sha256Base64Url(secretBytes);
        const room = tag.slice(0, 32);

        // start Y and hold provider disconnected until persistence catches up
        const svc = await startYSync({ room, signalingUrls, autoConnect: false });
        svcRef.current = Promise.resolve(svc) as any;

        await loadAllUpdatesEncrypted(svc.doc, storage, feedKey, keys.aes);
        const idStore = new IdentityStore();
        const peer = await idStore.loadPeer(room);
        if (!peer) throw new Error('No peer identity stored for this room');
        const theirKemPkB64 = peer?.kemPkB64; // can be undefined

        const km = new KeyManager();
        // ml-kem provider (you already load it in KeyManager and set as default)
        const kem = (KeyManager as any).kemRegistry?.get?.() ?? { name: 'ML-KEM-1024' }; // or import from wherever you register it

        // Ensure local Kyber keys exist (you already do this in your tests)
        await km.getLocalKemPublicKeyB64();  // creates pk/sk if missing
        // Load local secret & remote pk from storage blobs
        const provider = kem.get(); // active KEM provider (Kyber or fallback)
        const skBlob = await (km as any).storage.loadBlob(`wellium/kem/${provider.name}/sk`);
        if (!skBlob) throw new Error('No local KEM secret');
        const myKemSkB64 = new TextDecoder().decode(skBlob);


        // Start encrypted bridge
        const enc = new EncryptedYTransport(
            svc.provider as any,
            svc.doc,
            provider,
            myKemSkB64,
            peer.kemPkB64,
            km,                 // new
            secretB64,          // new: pairing secret b64
            false,              // new: isBootstrapSender (set true on the sender side)
            undefined           // onReady
        );
        enc.start();

        setStatus("connecting");
        svc.provider.connect();
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
            p.then((svc: Awaited<ReturnType<typeof startYSync>>) => svc.stop()).catch(() => { });
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
