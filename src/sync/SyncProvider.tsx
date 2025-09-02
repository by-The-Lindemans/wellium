// src/sync/SyncProvider.tsx
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
    return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function SyncProvider(props: { signalingUrls: string[]; children: React.ReactNode }) {
    const { signalingUrls, children } = props;

    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | undefined>();
    const [ydoc, setYDoc] = useState<Y.Doc | undefined>();
    const [ymap, setYMap] = useState<Y.Map<any> | undefined>();

    const svcPromiseRef = useRef<Promise<ReturnType<typeof startYSync>> | null>(null);
    /** cleanup for the current heartbeat (interval + key removal) */
    const hbCleanupRef = useRef<() => void>();
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

        // Stop any previous heartbeat if we’re reconnecting.
        try { hbCleanupRef.current?.(); } catch { }

        const sys = svc.doc.getMap('sys');
        setYDoc(svc.doc);
        setYMap(sys);

        // Heartbeat under a deterministic per-session key
        const hbKey = `hb:${svc.doc.clientID}`;
        // Persist the exact key so the join screen can ignore its own heartbeat.
        try { localStorage.setItem('wl/hb-key', hbKey); } catch { }

        const tick = () => sys.set(hbKey, Date.now());
        tick();
        const hbTimer = setInterval(tick, 3000);

        hbCleanupRef.current = () => {
            try { clearInterval(hbTimer); } catch { }
            try { sys.delete(hbKey); } catch { }
            try { localStorage.removeItem('wl/hb-key'); } catch { }
        };

        // who sends bootstrap? (scanner does)
        const isBootstrapSender = sessionStorage.getItem('wl/bootstrap-sender') === '1';

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
            (newSecretB64) => {
                // We just got provisioned into the mesh; switch rooms.
                sessionStorage.removeItem('wl/bootstrap-sender');
                // Stop the staging connection and re-pair into the mesh room.
                setTimeout(() => {
                    disconnect();
                    void pairWithSecret(newSecretB64);
                }, 0);
            }
        );
        enc.start();

        setStatus('connecting');
        svc.provider.connect();
        try {
            const provider = svc.provider as any;
            const sys = svc.doc.getMap('sys');
            const myHbKey = localStorage.getItem('wl/hb-key') || `hb:${svc.doc.clientID}`;

            const ok = () => {
                const aware = provider.awareness?.getStates?.().size || 0;
                let hbPeers = 0;
                (sys as any).forEach?.((v: any, k: string) => { if (k.startsWith('hb:') && k !== myHbKey && typeof v === 'number' && Date.now() - v < 10000) hbPeers++; });
                return aware > 1 || hbPeers > 0;
            };

            const start = Date.now();
            const poll = () => {
                if (ok()) { setStatus('connected'); return; }
                if (Date.now() - start > 20000) { setStatus('error'); setError('no peer detected'); return; }
                setTimeout(poll, 250);
            };
            poll();
        } catch { setTimeout(() => setStatus('connected'), 300); }
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
        // Stop heartbeat and remove our hb key
        try { hbCleanupRef.current?.(); } catch { }

        const p = svcPromiseRef.current;
        if (p && typeof (p as any).then === 'function') {
            (p as any)
                .then((svc: Awaited<ReturnType<typeof startYSync>>) => svc.stop())
                .catch(() => { });
        }
        svcPromiseRef.current = null;
        setYDoc(undefined);
        setYMap(undefined);
        setStatus('idle');
    }

    function clearSavedSecret() {
        try { localStorage.removeItem(SECRET_KEY); } catch { }
    }

    useEffect(() => {
        const saved = (() => {
            try { return localStorage.getItem(SECRET_KEY); } catch { return null; }
        })();
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
