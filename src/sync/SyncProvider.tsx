import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { startYSync, roomTagFromSecretB64, ROOM_TAG_LEN } from './yjsSync';
import { loadAllUpdatesEncrypted } from './yjsStorage';
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { deriveKeysFromSecret, kem as kemRegistry, bytesToB64url } from '@crypto/KeyManager';
import { EncryptedYTransport } from './EncryptedYTransport';
import { IdentityStore } from '@crypto/identity';
import { KeyManager } from '@crypto/KeyManager';

type Status = 'idle' | 'hydrating' | 'connecting' | 'connected' | 'error';

type SyncCtx = {
    status: Status;
    error?: string;
    ydoc?: Y.Doc;
    ymap?: Y.Map<any>;
    pairWithSecret: (secretB64: string) => Promise<void>;
    disconnect: () => void;
    clearSavedSecret: () => void;
};

const SECRET_KEY = 'wellium/pairing-secret';

const SyncContext = createContext<SyncCtx>({
    status: 'idle',
    pairWithSecret: async () => { },
    disconnect: () => { },
    clearSavedSecret: () => { },
});

function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function SyncProvider(props: { signalingUrls: string[]; children: React.ReactNode }) {
    const { signalingUrls, children } = props;

    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | undefined>();
    const [ydoc, setYDoc] = useState<Y.Doc | undefined>();
    const [ymap, setYMap] = useState<Y.Map<any> | undefined>();
    const svcPromiseRef = useRef<Promise<ReturnType<typeof startYSync>> | null>(null);
    const storage = useMemo(() => new CapacitorStorageAdapter(), []);

    async function hydrateAndConnect(secretBytes: Uint8Array) {
        setStatus('hydrating');
        setError(undefined);

        // derive per-room keys and stable tag from the same secret
        const secretB64 = bytesToB64url(secretBytes);
        const keys = await deriveKeysFromSecret(secretB64);
        const feedKey = 'yjs-' + keys.tag;

        const roomTag = (await roomTagFromSecretB64(secretB64)).slice(0, ROOM_TAG_LEN);
        const room = roomTag;

        // start Y and hold provider disconnected until persistence catches up
        const svcP = startYSync({ room, signalingUrls, autoConnect: false });
        svcPromiseRef.current = svcP as any;
        const svc = await svcP;

        await loadAllUpdatesEncrypted(svc.doc, storage, feedKey, keys.aes);

        // (optional) expose doc/map to context consumers
        setYDoc(svc.doc);
        setYMap(undefined);

        // who sends bootstrap? (scanner does)
        const isBootstrapSender = sessionStorage.getItem('wl/bootstrap-sender') === '1';
        //if (isBootstrapSender) sessionStorage.removeItem('wl/bootstrap-sender'); testing move

        // peer identity (may be missing on responder side)
        const idStore = new IdentityStore();
        const peer = await idStore.loadPeer(room);
        if (!peer) {
            console.warn('[sync] no peer identity yet for room', room, '(responder mode until hs2 arrives)');
        }
        const theirKemPkB64 = peer?.kemPkB64 || undefined;

        // KEM + local SK
        const km = new KeyManager();
        await km.getLocalKemPublicKeyB64(); // ensure created
        const provider = kemRegistry.get();
        const skBlob = await (km as any).storage.loadBlob(`wellium/kem/${provider.name}/sk`);
        if (!skBlob) throw new Error('No local KEM secret');
        const myKemSkB64 = new TextDecoder().decode(skBlob);

        // Start encrypted bridge
        const enc = new EncryptedYTransport(
            svc.provider,
            svc.doc,
            provider,
            myKemSkB64,
            theirKemPkB64 ?? '',
            km,
            secretB64,
            isBootstrapSender,
            () => {
                // once bootstrap completes, clear the marker
                sessionStorage.removeItem('wl/bootstrap-sender');
            }
        );
        enc.start();

        setStatus('connecting');
        svc.provider.connect();
        setTimeout(() => setStatus('connected'), 300);
    }

    async function pairWithSecret(secretB64: string) {
        try {
            localStorage.setItem(SECRET_KEY, secretB64);
            await hydrateAndConnect(b64urlToBytes(secretB64));
        } catch (e: any) {
            setError(String(e?.message ?? e));
            setStatus('error');
        }
    }

    function disconnect() {
        const p = svcPromiseRef.current;
        if (p && typeof (p as any).then === 'function') {
            (p as any).then((svc: Awaited<ReturnType<typeof startYSync>>) => svc.stop()).catch(() => { });
        }
        svcPromiseRef.current = null;
        setYDoc(undefined);
        setYMap(undefined);
        setStatus('idle');
    }

    function clearSavedSecret() {
        try { localStorage.removeItem(SECRET_KEY); } catch { /* ignore */ }
    }

    useEffect(() => {
        const saved = (() => { try { return localStorage.getItem(SECRET_KEY); } catch { return null; } })();
        if (saved) void pairWithSecret(saved);
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
