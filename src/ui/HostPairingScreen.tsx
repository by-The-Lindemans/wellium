import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonIcon, IonContent,
    IonText, IonList, IonItem
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { arrowBack } from 'ionicons/icons';
import { registerPlugin } from '@capacitor/core';
import {
    CapacitorBarcodeScannerPlugin,
    CapacitorBarcodeScannerCameraDirection as CameraDirection,
    CapacitorBarcodeScannerTypeHintALLOption as HintAll,
} from '@capacitor/barcode-scanner';

import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';

const Scanner = registerPlugin<CapacitorBarcodeScannerPlugin>('BarcodeScanner');
const SECRET_KEY = 'wellium/pairing-secret';

const HostPairingScreen: React.FC = () => {
    const navigate = useNavigate();
    const [msg, setMsg] = React.useState<string | null>(null);

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

            // Save secret so this device joins the room:
            localStorage.setItem(SECRET_KEY, req.pairingSecret);

            // Save peer identity (initiator on our side):
            const roomTag = (await sha256Base64Url(new TextEncoder().encode(req.pairingSecret))).slice(0, 16);
            const ids = new IdentityStore();
            await ids.savePeer(roomTag, { kemPkB64: req.kemPk, fingerprintB64: req.kemPkFp });

            // Flag initial bootstrap push for EncryptedYTransport:
            sessionStorage.setItem('wl/bootstrap-sender', '1');

            setMsg('Done! The new device will connect automatically.');
        } catch (e: any) {
            setMsg(e?.message ?? String(e));
        }
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton onClick={() => navigate(-1)}>
                            <IonIcon icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Scan new device</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonButton expand="block" onClick={handleScan} style={{ marginTop: 12 }}>
                    Open camera
                </IonButton>

                {msg && (
                    <IonList><IonItem lines="none"><IonText>{msg}</IonText></IonItem></IonList>
                )}
            </IonContent>
        </IonPage>
    );
};

export default HostPairingScreen;
