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
import { useSync } from '../sync/SyncProvider';

const SECRET_KEY = 'wellium/pairing-secret';

const JoinPairingScreen: React.FC<{ onFirstDevice?: () => void }> = () => {
    const contentRef = useRef<HTMLIonContentElement>(null);
    const introRef = useRef<HTMLDivElement>(null);

    const [side, setSide] = useState(0);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const navigate = useNavigate();

    const platform = Capacitor.getPlatform();
    const isMobile = platform === 'ios' || platform === 'android';
    const footerCta = isMobile
        ? 'This is my first wellium device'
        : 'I understand I need to set up on mobile first — continue';

    // Size the QR to available square inside IonContent (exclude intro block)
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const measure = () => {
            const rect = contentRef.current!.getBoundingClientRect();
            const introH = introRef.current?.offsetHeight ?? 0;

            // Free space inside content (footer/header already excluded by Ionic)
            const freeH = Math.max(0, rect.height - introH);
            const freeW = rect.width;

            // Take a comfortable square and clamp it
            const candidate = Math.floor(Math.min(freeH, freeW) * 0.9);
            const clamped = Math.max(160, Math.min(candidate, 640)); // tweak min/max if you like
            setSide(clamped);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(contentRef.current);
        window.addEventListener('orientationchange', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('orientationchange', measure);
        };
    }, []);

    const { status, pairWithSecret } = useSync();
    // (re)draw QR whenever `side` changes
    useEffect(() => {
        if (!side) return;

        (async () => {
            const km = new KeyManager();
            const kemPk = await km.getLocalKemPublicKeyB64();
            const kemPkFp = await kyberFingerprintB64url(kemPk);

            let secret = localStorage.getItem(SECRET_KEY);
            if (!secret) {
                secret = generatePairingSecret();
                localStorage.setItem(SECRET_KEY, secret);
                pairWithSecret(secret)
            }

            const payload = JSON.stringify({ v: 1, pairingSecret: secret, kemPk, kemPkFp });
            const dpr = window.devicePixelRatio || 1;

            const url = await QRCode.toDataURL(payload, {
                // A proper quiet zone (4 modules is the QR spec recommendation)
                margin: 4,
                // Stronger error correction helps on glare / moiré screens
                errorCorrectionLevel: 'Q', // or 'H'
                width: Math.round(side * dpr),
                color: {
                    dark: '#000000',   // modules
                    light: '#FFFFFF'   // ensure an actual white border (not transparent)
                }
            });

            setQrUrl(url);
        })();

        if (status === 'connected') {
            navigate('/home', { replace: true });
        }

    }, [side, pairWithSecret, status, navigate]);


    const goToDashboard = () => {
        localStorage.setItem('wl/onboarding-ok', '1'); // so Guard won’t loop back here
        navigate('/', { replace: true });
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Show this QR</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Global CSS already centers until it needs to scroll */}
            <IonContent ref={contentRef} className="ion-padding">
                {/* Intro text sits above the QR and is part of the content height */}
                <div ref={introRef} style={{ maxWidth: 720 }}>
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

                {/* QR – sized from free space inside content */}
                {qrUrl && (
                    <img
                        src={qrUrl}
                        alt="pairing qr"
                        width={side}
                        height={side}
                        style={{
                            width: side,
                            height: side,
                            maxWidth: '92vw',
                            maxHeight: '92vw',
                            imageRendering: 'pixelated'
                        }}
                    />
                )}
            </IonContent>

            {/* Footer is anchored by Ionic; no need to subtract it from content height */}
            <IonFooter>
                <div style={{ padding: '12px 16px', maxWidth: 720, marginInline: 'auto' }}>
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
