import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { canOpenCamera } from '../utils/platform';
import QRCode from 'qrcode';

import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { sha256Base64Url } from '../sync/yjsSync';

const SECRET_KEY = 'wellium/pairing-secret';

const navigate = useNavigate();
const canScan = canOpenCamera();
const ctaLabel = canScan
    ? 'This is my first wellium device'
    : 'I understand that I need to set up Wellium on mobile first — continue anyway';

const JoinPairingScreen: React.FC = () => {
    const navigate = useNavigate();

    const introRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLIonContentElement>(null);

    const [side, setSide] = useState(0);
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    // Measure available square inside content (no scroll)
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const measure = () => {
            const rect = contentRef.current!.getBoundingClientRect();
            const intro = introRef.current?.offsetHeight ?? 0;

            const freeH = rect.height - intro - 24; // small gap
            const freeW = rect.width;
            const short = Math.min(freeW, freeH);

            setSide(Math.max(0, Math.floor(short * 0.9)));
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(contentRef.current);
        return () => ro.disconnect();
    }, []);

    // Create QR whenever side changes
    useEffect(() => {
        if (!side) return;

        (async () => {
            const km = new KeyManager();
            const kemPk = await km.getLocalKemPublicKeyB64();
            const kemFp = await kyberFingerprintB64url(kemPk);

            // ensure secret exists
            let secret = localStorage.getItem(SECRET_KEY);
            if (!secret) {
                const u = new Uint8Array(32);
                crypto.getRandomValues(u);
                const b64url = btoa(String.fromCharCode(...u))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                secret = b64url;
                localStorage.setItem(SECRET_KEY, secret);
            }

            // room tag (optional, consistent with your storage)
            await sha256Base64Url(new TextEncoder().encode(secret));

            const payload = JSON.stringify({ v: 1, pairingSecret: secret, kemPk, kemPkFp: kemFp });
            const dpr = window.devicePixelRatio || 1;

            const url = await QRCode.toDataURL(payload, {
                margin: 0,
                width: side * dpr, // physical pixels for crispness
            });

            setQrUrl(url);
        })();
    }, [side]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Show this QR</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent ref={contentRef}>
                <div ref={introRef}>
                    <IonList>
                        <IonItem lines="none">
                            <IonText>
                                <p style={{ marginBlock: 12 }}>
                                    Ask a device that has a camera to open <em>Scan&nbsp;new&nbsp;device</em> and aim at this code.
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

                <div style={{ marginTop: 28 }}>
                    <IonText>
                        <p>
                            <strong>New here?</strong> If this is your first welliuᴍ device, you don’t need to scan anything.
                        </p>
                    </IonText>
                    <IonButton
                        fill="outline"
                        expand="block"
                        onClick={() => {
                            localStorage.setItem('wl/onboarding-ok', '1');
                            navigate('/home', { replace: true });
                        }}
                    >
                        {ctaLabel}
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default JoinPairingScreen;
