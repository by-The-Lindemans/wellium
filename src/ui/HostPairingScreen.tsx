// src/pages/HostPairingScreen.tsx
import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent, IonText, IonList, IonItem, IonButton
} from '@ionic/react';
import * as Y from 'yjs';
import jsQR from 'jsqr';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { useSync } from '../sync/SyncProvider';
import { roomTagFromSecretB64, ROOM_TAG_LEN } from '../sync/yjsSync';

const SECRET_KEY = 'wellium/pairing-secret';

type Ui = {
    phase: 'init' | 'camera-ready' | 'decoding' | 'done' | 'error';
    note: string;
    engine: 'BarcodeDetector(video)' | 'BarcodeDetector(bitmap)' | 'jsQR' | 'N/A';
    frames: number;
    video: string;     // e.g. 1920x1080
    formats: string;   // supported formats list
    lastErr?: string;
};

const HostPairingScreen: React.FC = () => {
    const { pairWithSecret, ymap } = useSync(); // <-- minimal: pull ymap for heartbeat
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    // minimal: keep a reference to the opened stream so we can stop it after decode
    const streamRef = React.useRef<MediaStream | null>(null);
    // minimal: avoid repeated onDecoded when camera keeps feeding frames
    const acceptedRef = React.useRef(false);

    const [ui, setUi] = React.useState<Ui>({
        phase: 'init',
        note: 'Opening camera…',
        engine: 'N/A',
        frames: 0,
        video: '-',
        formats: '(checking…)',
    });

    // ---- new: observe heartbeat map; declare success only when >=2 fresh heartbeats ----
    React.useEffect(() => {
        if (!ymap) return;

        const isFresh = (ts: any) => typeof ts === 'number' && Date.now() - ts < 10_000;

        const checkPeers = () => {
            let fresh = 0;
            (ymap as Y.Map<any>).forEach((v, k) => {
                if (typeof k === 'string' && k.startsWith('hb:') && isFresh(v)) fresh++;
            });
            if (fresh >= 2) {
                setUi(s => ({ ...s, phase: 'done', note: 'Paired. You can go back.' }));
            }
        };

        (ymap as Y.Map<any>).observe(checkPeers);
        const t = setInterval(checkPeers, 2000);
        checkPeers();
        return () => { try { (ymap as Y.Map<any>).unobserve(checkPeers); } catch { } clearInterval(t); };
    }, [ymap]);

    React.useEffect(() => {
        let stream: MediaStream | null = null;
        let tickTimer: any = null;
        let cancelled = false;
        // @ts-ignore
        const BD: any = (window as any).BarcodeDetector;

        (async () => {
            try {
                // Show supported formats (if API exists)
                if (BD?.getSupportedFormats) {
                    try {
                        const fmts: string[] = await BD.getSupportedFormats();
                        setUi(s => ({ ...s, formats: fmts.join(', ') || '(none)' }));
                    } catch {
                        setUi(s => ({ ...s, formats: '(error reading formats)' }));
                    }
                } else {
                    setUi(s => ({ ...s, formats: '(BarcodeDetector not available)' }));
                }

                // Open camera
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
                streamRef.current = stream; // <-- minimal: keep it for stopping later

                if (!videoRef.current) return;
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.muted = true;

                await videoRef.current.play().catch(() => { /* ignore */ });
                setUi(s => ({ ...s, phase: 'camera-ready', note: 'Camera ready. Scanning…' }));

                // Prepare detector (if available)
                const detector = BD ? new BD({ formats: ['qr_code'] }) : null;

                // Decode loop
                const run = async () => {
                    if (cancelled || !videoRef.current) return;
                    const v = videoRef.current;

                    // Wait until the video has data
                    if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) {
                        tickTimer = setTimeout(run, 100);
                        return;
                    }

                    // Update diagnostics
                    setUi(s => ({ ...s, frames: s.frames + 1, video: `${v.videoWidth}×${v.videoHeight}` }));

                    try {
                        // 1) Fast path: BarcodeDetector on video element
                        if (detector && !acceptedRef.current) {
                            const hits = await detector.detect(v);
                            if (hits && hits.length > 0) {
                                setUi(s => ({ ...s, engine: 'BarcodeDetector(video)', phase: 'decoding', note: 'QR detected (video)…' }));
                                await onDecoded(hits[0].rawValue ?? '');
                                return;
                            }
                        }

                        // 2) Draw to canvas and try BD on ImageBitmap
                        const canvas = canvasRef.current!;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                        // scale down to keep decoding fast (max 800px on the longer side)
                        const maxSide = 800;
                        const scale = Math.min(maxSide / v.videoWidth, maxSide / v.videoHeight, 1);
                        const cw = Math.max(1, Math.round(v.videoWidth * scale));
                        const ch = Math.max(1, Math.round(v.videoHeight * scale));
                        if (canvas.width !== cw) canvas.width = cw;
                        if (canvas.height !== ch) canvas.height = ch;
                        ctx.drawImage(v, 0, 0, cw, ch);

                        if (detector && 'createImageBitmap' in window && !acceptedRef.current) {
                            try {
                                const bmp = await createImageBitmap(canvas);
                                const hits2 = await detector.detect(bmp);
                                bmp.close?.();
                                if (hits2 && hits2.length > 0) {
                                    setUi(s => ({ ...s, engine: 'BarcodeDetector(bitmap)', phase: 'decoding', note: 'QR detected (bitmap)…' }));
                                    await onDecoded(hits2[0].rawValue ?? '');
                                    return;
                                }
                            } catch (e: any) {
                                setUi(s => ({ ...s, lastErr: `BD(bitmap) err: ${e?.message ?? e}` }));
                            }
                        }

                        // 3) Pure JS fallback: jsQR
                        if (!acceptedRef.current) {
                            try {
                                const img = ctx.getImageData(0, 0, cw, ch);
                                const code = jsQR(img.data, cw, ch, { inversionAttempts: 'attemptBoth' });
                                if (code?.data) {
                                    setUi(s => ({ ...s, engine: 'jsQR', phase: 'decoding', note: 'QR detected (jsQR)…' }));
                                    await onDecoded(code.data);
                                    return;
                                }
                            } catch (e: any) {
                                setUi(s => ({ ...s, lastErr: `jsQR err: ${e?.message ?? e}` }));
                            }
                        }
                    } catch (e: any) {
                        setUi(s => ({ ...s, lastErr: `loop err: ${e?.message ?? e}` }));
                    }

                    tickTimer = setTimeout(run, 120);
                };

                tickTimer = setTimeout(run, 200);
            } catch (e: any) {
                setUi({ phase: 'error', note: e?.message ?? 'Failed to open camera', engine: 'N/A', frames: 0, video: '-', formats: ui.formats });
            }
        })();

        return () => {
            cancelled = true;
            if (tickTimer) clearTimeout(tickTimer);
            try { stream?.getTracks().forEach(t => t.stop()); } catch { }
            try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
            if (videoRef.current) try { (videoRef.current.srcObject as any) = null; } catch { }
        };
    }, []); // eslint-disable-line

    async function onDecoded(decodedText: string) {
        // minimal: prevent re-entry
        if (acceptedRef.current) return;
        acceptedRef.current = true;

        try {
            const req = JSON.parse(decodedText) as {
                v: number; pairingSecret: string; kemPk: string; kemPkFp: string;
            };
            if (req.v !== 1) throw new Error('Unexpected QR version');

            const fpCheck = await kyberFingerprintB64url(req.kemPk);
            if (fpCheck !== req.kemPkFp) throw new Error('Fingerprint mismatch');

            const fullTag = await roomTagFromSecretB64(req.pairingSecret);
            const roomTag = fullTag.slice(0, ROOM_TAG_LEN);

            const ids = new IdentityStore();
            await ids.savePeer(roomTag, { kemPkB64: req.kemPk, fingerprintB64: req.kemPkFp });

            localStorage.setItem(SECRET_KEY, req.pairingSecret);
            console.log('[pair] scan OK; setting host role and starting staging room');
            sessionStorage.setItem('wl/bootstrap-sender', '1');
            sessionStorage.setItem('wl/force-role', 'host');

            // start sync; SyncProvider will bring up the heartbeat
            setUi(s => ({ ...s, note: 'Code accepted. Waiting for the other device…' }));
            await pairWithSecret(req.pairingSecret);

            // minimal: stop camera once we have a valid code
            try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
            try { if (videoRef.current) (videoRef.current.srcObject as any) = null; } catch { }

            // do NOT set phase 'done' yet; the heartbeat watcher above will do it
        } catch (e: any) {
            setUi(s => ({ ...s, phase: 'error', note: e?.message ?? String(e) }));
            acceptedRef.current = false; // allow retry if something failed
        }
    }

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

            <IonContent className="scroll ion-padding">
                <div style={{ width: 'min(92vw, 720px)', margin: '0 auto' }}>
                    <div style={{
                        width: '100%', aspectRatio: '1 / 1', background: '#000',
                        borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center'
                    }}>
                        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        {/* hidden work canvas for fallbacks */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                </div>

                <IonList>
                    <IonItem lines="none">
                        <IonText>
                            <div><strong>Status:</strong> {ui.phase}</div>
                            <div><strong>Engine:</strong> {ui.engine}</div>
                            <div><strong>Video:</strong> {ui.video}</div>
                            <div><strong>Frames:</strong> {ui.frames}</div>
                            <div><strong>Supported formats:</strong> {ui.formats}</div>
                            <div>{ui.note}</div>
                            {ui.lastErr && <div style={{ fontSize: 12, opacity: 0.7 }}>lastErr: {ui.lastErr}</div>}
                            <div style={{ fontSize: 12, opacity: 0.7 }}>isSecureContext: {String((globalThis as any).isSecureContext)}</div>
                        </IonText>
                    </IonItem>
                </IonList>

                <IonButton expand="block" color="medium" onClick={() => history.back()} style={{ margin: 12 }}>
                    Cancel
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
