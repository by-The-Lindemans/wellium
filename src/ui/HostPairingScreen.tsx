// src/pages/HostPairingScreen.tsx
import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent, IonText, IonList, IonItem, IonButton
} from '@ionic/react';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';

// Vite will emit the worker file and give us a URL we can pass to qr-scanner.
// TypeScript may not know about ?url; the ts-expect-error keeps your build clean.
// @ts-expect-error vite url import
import qrWorkerUrl from 'qr-scanner/qr-scanner-worker.min.js?url';

const SECRET_KEY = 'wellium/pairing-secret';

const HostPairingScreen: React.FC = () => {
    const [msg, setMsg] = React.useState('Point the camera at the QR…');

    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const scannerStopRef = React.useRef<null | (() => Promise<void>)>(null);
    const warmStreamRef = React.useRef<MediaStream | null>(null);

    // small on-screen logger to help in WebView (remove if you don’t want it)
    const [uiLog, setUiLog] = React.useState<string[]>([]);
    const log = React.useCallback((...a: any[]) => {
        const s = a.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
        console.log(s);
        setUiLog(l => [...l.slice(-70), s]);
    }, []);

    const handleDecoded = React.useCallback(async (decodedText: string) => {
        try {
            const req = JSON.parse(decodedText) as {
                v: number; pairingSecret: string; kemPk: string; kemPkFp: string;
            };
            if (req.v !== 1) throw new Error('Unexpected QR version');

            const fpCheck = await kyberFingerprintB64url(req.kemPk);
            if (fpCheck !== req.kemPkFp) throw new Error('Fingerprint mismatch');

            localStorage.setItem(SECRET_KEY, req.pairingSecret);

            const roomTag = (await sha256Base64Url(new TextEncoder().encode(req.pairingSecret))).slice(0, 16);
            const ids = new IdentityStore();
            await ids.savePeer(roomTag, { kemPkB64: req.kemPk, fingerprintB64: req.kemPkFp });

            sessionStorage.setItem('wl/bootstrap-sender', '1');
            setMsg('Done! The new device will connect automatically.');

            // stop scanner after success
            if (scannerStopRef.current) await scannerStopRef.current().catch(() => { });
            if (warmStreamRef.current) {
                warmStreamRef.current.getTracks().forEach(t => t.stop());
                warmStreamRef.current = null;
            }
        } catch (e: any) {
            setMsg(String(e?.message ?? e));
            log('[scan] decode error:', e);
        }
    }, [log]);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const video = videoRef.current!;
                if (!video) return;

                // 1) Warm-up: ensure the video element has real dimensions first
                // (prevents a “dead” decode loop in some WebViews)
                const devs = await navigator.mediaDevices.enumerateDevices().catch(() => []);
                const cams = devs.filter(d => d.kind === 'videoinput');
                const rx = /(back|rear|environment)/i;
                const picked = cams.find(c => rx.test(c.label)) ?? cams[0];

                // If enumerateDevices returned empty (first permission prompt), request any camera:
                const warm = await navigator.mediaDevices.getUserMedia({
                    video: picked ? { deviceId: { ideal: picked.deviceId } } : { facingMode: 'environment' },
                    audio: false
                });
                warmStreamRef.current = warm;
                video.srcObject = warm;
                video.playsInline = true;
                video.muted = true;

                await new Promise<void>(res => {
                    if (video.readyState >= 1) res();
                    else video.addEventListener('loadedmetadata', () => res(), { once: true });
                });
                await video.play().catch(() => { });
                const track = warm.getVideoTracks()[0];
                log('[scan] track settings:', track?.getSettings?.());

                // 2) Start qr-scanner with the worker wired via Vite
                const { default: QrScanner } = await import('qr-scanner');
                (QrScanner as any).WORKER_PATH = qrWorkerUrl;

                const scanner = new QrScanner(
                    video,
                    (result: any) => {
                        if (cancelled) return;
                        const data: string | undefined = result?.data ?? result;
                        if (data) {
                            log('[scan] decoded:', data.slice(0, 64), '…');
                            void handleDecoded(data);
                        }
                    },
                    {
                        preferredCamera: picked?.deviceId,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        // generous centered square box improves reliability
                        calculateScanRegion: (v: HTMLVideoElement) => {
                            const s = Math.min(v.videoWidth || 0, v.videoHeight || 0);
                            const w = Math.round(s * 0.8);
                            const x = Math.max(0, Math.round(((v.videoWidth || w) - w) / 2));
                            const y = Math.max(0, Math.round(((v.videoHeight || w) - w) / 2));
                            return { x, y, width: w, height: w };
                        },
                    }
                );

                await scanner.start();
                log('[scan] qr-scanner started', picked?.label || picked?.deviceId || '(camera)');

                // let qr-scanner own the stream; stop warmup
                warm.getTracks().forEach(t => t.stop());
                warmStreamRef.current = null;

                scannerStopRef.current = () => scanner.stop();
            } catch (e: any) {
                setMsg(String(e?.message ?? e));
                log('[scan] start error:', e);
            }
        })();

        return () => {
            cancelled = true;
            if (scannerStopRef.current) {
                scannerStopRef.current().catch(() => { }).finally(() => {
                    scannerStopRef.current = null;
                });
            }
            if (warmStreamRef.current) {
                warmStreamRef.current.getTracks().forEach(t => t.stop());
                warmStreamRef.current = null;
            }
        };
    }, [handleDecoded, log]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/settings" />
                    </IonButtons>
                    <IonTitle>Scan new device</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                {/* Camera viewport — fills width, stays tall enough to scan.
            Aspect ratio cooperates with your global CSS + scrolling. */}
                <div style={{
                    width: '100%',
                    aspectRatio: '3 / 4',
                    background: '#000',
                    display: 'grid',
                    placeItems: 'center'
                }}>
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>

                <IonList>
                    <IonItem lines="none"><IonText>{msg}</IonText></IonItem>
                </IonList>

                <IonButton expand="block" color="medium" onClick={() => history.back()} style={{ margin: 12 }}>
                    Cancel
                </IonButton>

                {/* remove this debug panel once you’re happy */}
                {import.meta.env.DEV && (
                    <div style={{
                        position: 'fixed', left: 8, right: 8, bottom: 8, maxHeight: '30vh',
                        overflow: 'auto', background: 'rgba(0,0,0,.6)', color: '#ddd',
                        fontSize: 12, padding: 8, borderRadius: 8, zIndex: 9999
                    }}>
                        {uiLog.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
