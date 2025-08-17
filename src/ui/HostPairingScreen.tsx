import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent, IonText, IonList, IonItem, IonButton
} from '@ionic/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { useSync } from '../sync/SyncProvider';
import { roomTagFromSecretB64, ROOM_TAG_LEN } from '../sync/yjsSync';

const SECRET_KEY = 'wellium/pairing-secret';

const HostPairingScreen: React.FC = () => {
    const [msg, setMsg] = React.useState('Point the camera at the QR…');
    const [scanning, setScanning] = React.useState(false);
    const divId = React.useRef('qr-region-' + Math.random().toString(36).slice(2));
    const scannerRef = React.useRef<Html5Qrcode | null>(null);

    const { pairWithSecret } = useSync();

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // Pre-prompt for camera permission for better UX on some Android WebViews.
                try {
                    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    s.getTracks().forEach(t => t.stop());
                } catch {
                    /* ignore — html5-qrcode will prompt if needed */
                }

                // Set verbose true only in dev to avoid noisy consoles in prod.
                const verbose = import.meta.env?.DEV === true;
                const scanner = new Html5Qrcode(divId.current, verbose);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 12,
                        qrbox: (vw, vh) => {
                            const s = Math.min(vw, vh);
                            const box = Math.round(s * 0.85);
                            return { width: box, height: box };
                        },
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                        focusMode: 'continuous',
                        aspectRatio: 1.0,
                    },
                    async (decodedText) => {
                        if (cancelled) return;

                        try {
                            // Expected payload from JoinPairingScreen
                            const req = JSON.parse(decodedText) as {
                                v: number; pairingSecret: string; kemPk: string; kemPkFp: string;
                            };
                            if (req.v !== 1) throw new Error('Unexpected QR version');

                            // Verify that the embedded public key fingerprint matches
                            const fpCheck = await kyberFingerprintB64url(req.kemPk);
                            if (fpCheck !== req.kemPkFp) throw new Error('Fingerprint mismatch');

                            // Compute room tag in the same way the sync layer does (MUST match)
                            const fullTag = await roomTagFromSecretB64(req.pairingSecret);
                            const roomTag = fullTag.slice(0, ROOM_TAG_LEN);

                            // Save peer identity for this room
                            const ids = new IdentityStore();
                            await ids.savePeer(roomTag, { kemPkB64: req.kemPk, fingerprintB64: req.kemPkFp });

                            // Persist secret and mark this device as the bootstrap sender
                            localStorage.setItem(SECRET_KEY, req.pairingSecret);
                            sessionStorage.setItem('wl/bootstrap-sender', '1');

                            // Kick the sync immediately (don’t wait for remount)
                            await pairWithSecret(req.pairingSecret);

                            setMsg('Done! The new device will connect automatically.');
                            try { await scanner.stop(); } catch { /* ignore */ }
                        } catch (e: any) {
                            setMsg(e?.message ?? String(e));
                        }
                    },
                    // per-frame decode failures (noise) — keep silent
                    () => { /* no-op */ }
                );

                if (!cancelled) setScanning(true);
            } catch (e: any) {
                setMsg(e?.message ?? 'Failed to open camera');
            }
        })();

        return () => {
            cancelled = true;
            setScanning(false);
            // Ensure we stop & clear the scanner on unmount
            (async () => {
                try { await scannerRef.current?.stop(); } catch { /* ignore */ }
                try { scannerRef.current?.clear(); } catch { /* ignore */ }
                scannerRef.current = null;
            })();
        };
    }, [pairWithSecret]);

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

            {/* Make this content scroll when needed (your global CSS centers until it must scroll). */}
            <IonContent className="scroll ion-padding">
                <div
                    style={{
                        inlineSize: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        rowGap: 12,
                    }}
                >
                    {/* Camera preview target — a big square tied to viewport width. */}
                    <div
                        id={divId.current}
                        style={{
                            width: 'min(92vw, 720px)',
                            aspectRatio: '1 / 1',
                            background: '#000',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    />
                </div>

                <IonList>
                    <IonItem lines="none">
                        <IonText>
                            {scanning ? msg : 'Starting camera…'}
                        </IonText>
                    </IonItem>
                </IonList>

                <IonButton
                    expand="block"
                    color="medium"
                    onClick={() => history.back()}
                    style={{ margin: 12 }}
                >
                    Cancel
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
