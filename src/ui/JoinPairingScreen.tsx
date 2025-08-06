import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton, IonFooter
} from '@ionic/react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';

import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

type JoinProps = { onFirstDevice?: () => void };

const JoinPairingScreen: React.FC<JoinProps> = ({ onFirstDevice }) => {
    const navigate = useNavigate();

    const contentRef = React.useRef<HTMLIonContentElement>(null);
    const introRef = React.useRef<HTMLDivElement>(null);
    const footerRef = React.useRef<HTMLDivElement>(null);

    const [side, setSide] = React.useState(0);
    const [qrUrl, setQrUrl] = React.useState<string | null>(null);

    // measure available square in content (must be inside component)
    React.useLayoutEffect(() => {
        if (!contentRef.current) return;
        const measure = () => {
            const rect = contentRef.current!.getBoundingClientRect();
            const intro = introRef.current?.offsetHeight ?? 0;
            const footer = footerRef.current?.offsetHeight ?? 0;
            const freeH = rect.height - intro - footer;
            const freeW = rect.width;
            const short = Math.min(freeW, freeH);
            setSide(Math.max(0, Math.floor(short * 0.9)));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(contentRef.current);
        return () => ro.disconnect();
    }, []);

    // (re)draw QR whenever side changes
    React.useEffect(() => {
        if (!side) return;

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
            const dpr = window.devicePixelRatio || 1;

            const url = await QRCode.toDataURL(payload, {
                margin: 0,
                width: side * dpr,
            });

            setQrUrl(url);
        })();
    }, [side]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar><IonTitle>Show this QR</IonTitle></IonToolbar>
            </IonHeader>

            <IonContent ref={contentRef}>
                <div ref={introRef}>
                    <IonList>
                        <IonItem lines="none">
                            <IonText>
                                <p style={{ marginBlock: 12 }}>
                                    Ask a device that has a camera to open <em>Scan new device</em> and aim at this code.
                                    Pairing will finish automatically.
                                </p>
                            </IonText>
                        </IonItem>
                    </IonList>
                </div>

                {qrUrl && (
                    <img
                        src={qrUrl}
                        alt="pairing qr"
                        width={side}
                        height={side}
                        style={{ width: side, height: side }}
                    />
                )}
            </IonContent>

            <IonFooter>
                <div ref={footerRef} className="ion-padding">
                    <IonText>
                        <p>
                            <strong>New here?</strong> If this is your first welliuᴍ device, you don’t need to scan anything.
                        </p>
                    </IonText>
                    <IonButton
                        fill="outline"
                        expand="block"
                        onClick={() => {
                            // prefer caller, otherwise mark and go home (RRv7: use navigate, don’t return <Navigate/>)
                            if (onFirstDevice) onFirstDevice();
                            else {
                                localStorage.setItem('wl/onboarding-ok', '1');
                                navigate('/', { replace: true });
                            }
                        }}
                    >
                        This is my first wellium device
                    </IonButton>
                </div>
            </IonFooter>
        </IonPage>
    );
};

export default JoinPairingScreen;
