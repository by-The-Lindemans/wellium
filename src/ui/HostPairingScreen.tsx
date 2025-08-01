import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButton, IonText, IonList, IonItem
} from '@ionic/react';
import { registerPlugin } from '@capacitor/core';
import {
    CapacitorBarcodeScannerPlugin,
    CapacitorBarcodeScannerCameraDirection as CameraDirection,
    CapacitorBarcodeScannerTypeHintALLOption as HintAll,
} from '@capacitor/barcode-scanner';

import { KeyManager } from '../crypto/KeyManager';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';

const Scanner = registerPlugin<CapacitorBarcodeScannerPlugin>('BarcodeScanner');
const SECRET_KEY = 'welliuᴍ/pairing-secret';

/**
 * HostPairingScreen
 * ------------------
 * Runs on any device that **has a camera** and is already part of the mesh.
 * 1. Opens the camera and scans the QR shown on the new (camera-less) device.
 * 2. Verifies fingerprint, saves the pairing secret locally so *we* join the room.
 * 3. Saves the peer's Kyber PK so we can initiate future sessions.
 * 4. Flags this tab as the bootstrap-sender; EncryptedYTransport will push the
 *    wrapped master key automatically once the WebRTC session comes up.
 */
const HostPairingScreen: React.FC = () => {
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

            // fingerprint safety check
            const fpCheck = await kyberFingerprintB64url(req.kemPk);
            if (fpCheck !== req.kemPkFp) throw new Error('Fingerprint mismatch');

            // 1. Persist the pairing secret so this device joins the room
            localStorage.setItem(SECRET_KEY, req.pairingSecret);

            // 2. Save peer identity (so we can be initiator)
            const roomTag = (await sha256Base64Url(new TextEncoder().encode(req.pairingSecret))).slice(0, 16);
            const ids = new IdentityStore();
            await ids.savePeer(roomTag, { kemPkB64: req.kemPk, fingerprintB64: req.kemPkFp });

            // 3. Flag bootstrap-sender for next EncryptedYTransport start
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