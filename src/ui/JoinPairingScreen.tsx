// src/ui/JoinPairingScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton, IonFooter
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';
import * as Y from 'yjs';

import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret, useSync } from '../sync/SyncProvider';

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

    // NOTE: useSync gives us ymap for heartbeats and pairWithSecret to auto-join
    const { ymap, pairWithSecret } = useSync();

    // Size the QR to available square inside IonContent (exclude intro block)
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const measure = () => {
            const rect = contentRef.current!.getBoundingClientRect();
            const introH = introRef.current?.offsetHeight ?? 0;

            const freeH = Math.max(0, rect.height - introH);
            const freeW = rect.width;
            const candidate = Math.floor(Math.min(freeH, freeW) * 0.9);
            const clamped = Math.max(160, Math.min(candidate, 640));
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

    // Render QR + ensure we join the room if we just minted a fresh secret
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
                pairWithSecret(secret);
            }

            const payload = JSON.stringify({ v: 1, pairingSecret: secret, kemPk, kemPkFp });
            const dpr = window.devicePixelRatio || 1;

            const url = await QRCode.toDataURL(payload, {
                margin: 4,
                errorCorrectionLevel: 'Q',
                width: Math.round(side * dpr),
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            setQrUrl(url);
        })();
    }, [side, pairWithSecret]);

    // === Only leave when we actually see a peer ===
    useEffect(() => {
        if (!ymap) return;

        const map = ymap as unknown as Y.Map<any>;
        const myHbKey = localStorage.getItem('wl/hb-key') || ''; // heartbeat writer should set this
        const isFresh = (ts: any) => typeof ts === 'number' && Date.now() - ts < 10_000;

        let stableHits = 0; // require consecutive confirmations
        const check = () => {
            let othersFresh = 0;
            map.forEach((v, k) => {
                if (typeof k === 'string' && k.startsWith('hb:') && k !== myHbKey && isFresh(v)) {
                    othersFresh++;
                }
            });

            if (othersFresh >= 1) {
                stableHits++;
                if (stableHits >= 2) { // two consecutive checks (~3s) to avoid blips
                    localStorage.setItem('wl/onboarding-ok', '1');
                    navigate('/home', { replace: true });
                }
            } else {
                stableHits = 0;
            }
        };

        map.observe(check);
        const t = setInterval(check, 1500);
        check();
        return () => { try { map.unobserve(check); } catch { } clearInterval(t); };
    }, [ymap, navigate]);

    const goToDashboard = () => {
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

            <IonContent ref={contentRef} className="ion-padding">
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

                {qrUrl && (
                    <img
                        src={qrUrl}
                        alt="pairing qr"
                        width={side}
                        height={side}
                        style={{ width: side, height: side, maxWidth: '92vw', maxHeight: '92vw', imageRendering: 'pixelated' }}
                    />
                )}
            </IonContent>

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
