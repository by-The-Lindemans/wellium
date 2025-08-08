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
                // Ask camera permission via getUserMedia first (better UX/errors)
                await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(stream => { stream.getTracks().forEach(t => t.stop()); })
                    .catch(() => { /* ignore — html5-qrcode will ask again */ });

                const scanner = new Html5Qrcode(divId.current, /* verbose */ false);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: (vw, vh) => {
                            const s = Math.min(vw, vh);
                            const box = Math.round(s * 0.7);
                            return { width: box, height: box };
                        },
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
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
                    // Failure callback (per-frame decode errors)
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

            <IonContent>
                {/* camera preview container */}
                <div id={divId.current} style={{
                    width: '100%', aspectRatio: '3 / 4',
                    background: '#000', display: 'grid', placeItems: 'center'
                }} />
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
