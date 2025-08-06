// src/ui/HostPairingScreen.tsx
import { useEffect, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent,
    IonButton, IonText, IonList, IonItem
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { registerPlugin } from '@capacitor/core';
import {
    CapacitorBarcodeScannerPlugin,
    CapacitorBarcodeScannerCameraDirection as CameraDirection,
    CapacitorBarcodeScannerTypeHintALLOption as HintAll,
} from '@capacitor/barcode-scanner';

import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';
import { canOpenCamera } from '../utils/platform';

const Scanner = registerPlugin<CapacitorBarcodeScannerPlugin>('BarcodeScanner');
const SECRET_KEY = 'welliuᴍ/pairing-secret';

const HostPairingScreen: React.FC = () => {
    const navigate = useNavigate();
    const [msg, setMsg] = useState<string | null>(null);
    const canScan = canOpenCamera();
    const [autoTried, setAutoTried] = useState(false);

    async function handleScan() {
        try {
            const res = await Scanner.scanBarcode({
                hint: HintAll.ALL,
                cameraDirection: CameraDirection.BACK,
            });
            if (!res?.ScanResult) throw new Error('No QR detected');

            const req = JSON.parse(res.ScanResult) as {
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
        } catch (e: any) {
            setMsg(e?.message ?? String(e));
        }
    }

    // Auto-open camera on supported platforms
    useEffect(() => {
        if (canScan && !autoTried) {
            setAutoTried(true);
            void handleScan();
        }
    }, [canScan, autoTried]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Scan new device</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {canScan ? (
                    <>
                        <IonButton expand="block" onClick={handleScan} style={{ marginTop: 12 }}>
                            Open camera
                        </IonButton>
                        {msg && (
                            <IonList>
                                <IonItem lines="none"><IonText>{msg}</IonText></IonItem>
                            </IonList>
                        )}
                    </>
                ) : (
                    <IonList>
                        <IonItem lines="none">
                            <IonText>
                                <p>
                                    Camera scanning is only available on iOS/Android.
                                    Open Wellium on a mobile device and use <em>Scan new device</em> there.
                                </p>
                            </IonText>
                        </IonItem>
                    </IonList>
                )}
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
