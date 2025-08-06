// src/ui/JoinPairingScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton, IonFooter
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';

import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

const JoinPairingScreen: React.FC<{ onFirstDevice?: () => void }> = () => {
    const contentRef = useRef<HTMLIonContentElement>(null);
    const introRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);

    const [side, setSide] = useState(0);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const navigate = useNavigate();

    const platform = Capacitor.getPlatform();
    const isMobile = platform === 'ios' || platform === 'android';
    const footerCta = isMobile
        ? 'This is my first wellium device'
        : 'I understand I need to set up on mobile first — continue';

    // measure available square area
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const measure = () => {
            const rect = contentRef.current!.getBoundingClientRect();
            const introH = introRef.current?.offsetHeight ?? 0;
            const footerH = footerRef.current?.offsetHeight ?? 0;
            const freeH = rect.height - introH - footerH;
            const freeW = rect.width;
            const short = Math.min(freeW, freeH);
            setSide(Math.max(0, Math.floor(short * 0.9)));
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(contentRef.current);
        return () => ro.disconnect();
    }, []);

    // (re)draw QR whenever `side` changes
    useEffect(() => {
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
                width: side * dpr, // physical pixels for crispness
            });

            setQrUrl(url);
        })();
    }, [side]);

    const goToDashboard = () => {
        // mark onboarding complete so the guard won’t redirect back here
        localStorage.setItem('wl/onboarding-ok', '1');
        navigate('/', { replace: true });
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Show this QR</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent ref={contentRef}>
                {/* intro paragraph */}
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

                {/* QR */}
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

            {/* footer CTA always navigates to dashboard */}
            <IonFooter>
                <div ref={footerRef} style={{ padding: '12px 16px' }}>
                    <IonText>
                        <p>
                            <strong>New here?</strong> If this is your first welliuᴍ device, you don’t need to scan anything.
                        </p>
                    </IonText>
                    <IonButton expand="block" fill="outline" onClick={goToDashboard}>
                        {footerCta}
                    </IonButton>
                </div>
            </IonFooter>
        </IonPage>
    );
};

export default JoinPairingScreen;
