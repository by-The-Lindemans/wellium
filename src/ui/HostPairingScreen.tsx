// src/pages/HostPairingScreen.tsx
import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent, IonText, IonList, IonItem, IonButton
} from '@ionic/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';

const SECRET_KEY = 'wellium/pairing-secret';

const HostPairingScreen: React.FC = () => {
    const [msg, setMsg] = React.useState('Point the camera at the QR…');
    const divId = React.useRef('qr-region-' + Math.random().toString(36).slice(2));
    const scannerRef = React.useRef<Html5Qrcode | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // (Optional) Pre-prompt for camera permission to surface OS dialog earlier
                await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(s => s.getTracks().forEach(t => t.stop()))
                    .catch(() => { /* ignore; html5-qrcode will prompt */ });

                const scanner = new Html5Qrcode(divId.current, /* verbose */ false);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 12,
                        // Make the scan box a large square relative to the container size
                        qrbox: (vw, vh) => {
                            const s = Math.min(vw, vh);
                            const box = Math.round(s * 0.85); // big but leaves a small margin
                            return { width: box, height: box };
                        },
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                        // Avoid shrinking on some devices
                        focusMode: 'continuous',
                        aspectRatio: 1.0
                    },
                    async (decodedText) => {
                        if (cancelled) return;
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
                            await scanner.stop();
                        } catch (e: any) {
                            setMsg(e?.message ?? String(e));
                        }
                    },
                    // onDecodeFailure (per-frame) — keep silent to avoid spam
                    () => { }
                );
            } catch (e: any) {
                setMsg(e?.message ?? 'Failed to open camera');
            }
        })();

        return () => {
            cancelled = true;
            scannerRef.current?.stop().catch(() => { }).finally(() => {
                scannerRef.current?.clear();
                scannerRef.current = null;
            });
        };
    }, []);

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

            {/* Make this content scroll when needed (uses your existing CSS rule) */}
            <IonContent className="scroll ion-padding">
                {/* Wrapper that fills the available content area; the inner region is a large square */}
                <div
                    style={{
                        inlineSize: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        // leave room for message/button while keeping the preview big on short screens
                        rowGap: 12,
                    }}
                >
                    {/* Camera preview target. Give it a real square size tied to the viewport. */}
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
                    <IonItem lines="none"><IonText>{msg}</IonText></IonItem>
                </IonList>

                <IonButton expand="block" color="medium" onClick={() => history.back()} style={{ margin: 12 }}>
                    Cancel
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
