import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton
} from '@ionic/react';
import QRCode from 'qrcode';
import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

function useSquareSide(pct = 0.9) {
    const [side, setSide] = React.useState(() => Math.floor(Math.min(window.innerWidth, window.innerHeight) * pct));
    React.useEffect(() => {
        const h = () => setSide(Math.floor(Math.min(window.innerWidth, window.innerHeight) * pct));
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [pct]);
    return side;
}

type JoinProps = { onFirstDevice?: () => void };

const JoinPairingScreen: React.FC<JoinProps> = ({ onFirstDevice }) => {
    const side = useSquareSide();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        (async () => {
            const km = new KeyManager();
            const kemPk = await km.getLocalKemPublicKeyB64();
            const kemFp = await kyberFingerprintB64url(kemPk);
            let secret = localStorage.getItem(SECRET_KEY);
            if (!secret) {
                secret = generatePairingSecret();
                localStorage.setItem(SECRET_KEY, secret);
            }
            const payload = JSON.stringify({ v: 1, pairingSecret: secret, kemPk, kemPkFp: kemFp });
            if (canvasRef.current) {
                await QRCode.toCanvas(canvasRef.current, payload, { margin: 2, width: side });
            }
        })();
    }, [side]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar><IonTitle>Show this QR</IonTitle></IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonList><IonItem lines="none"><IonText>
                    <p style={{ marginTop: 12 }}>
                        Ask a device that has a camera to open <em>Scan new device</em> and aim at this code.
                        No further action is needed on this device; pairing will complete automatically.
                    </p>
                </IonText></IonItem></IonList>
                <canvas ref={canvasRef} style={{ width: side, height: side }} />

                <div style={{ marginTop: 28 }}>
                    <IonText>
                        <p><strong>New here?</strong> If this is your first welliuᴍ device, you don’t need to scan anything.</p>
                    </IonText>
                    <IonButton fill="outline" expand="block" onClick={() => {
                        if (onFirstDevice) onFirstDevice();
                        else window.location.hash = '#/';
                    }}>
                        This is my first wellium device
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default JoinPairingScreen;
