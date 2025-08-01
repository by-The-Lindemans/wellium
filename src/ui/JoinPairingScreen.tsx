// src/ui/JoinPairingScreen.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonText, IonButton
} from '@ionic/react';
import QRCode from 'qrcode';

import { KeyManager } from '../crypto/KeyManager';
import { kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

type JoinProps = { onFirstDevice?: () => void };

const JoinPairingScreen: React.FC<JoinProps> = ({ onFirstDevice }) => {
    const headerRef = useRef<HTMLIonHeaderElement>(null);
    const introRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLIonContentElement>(null);

    const [side, setSide] = useState(0);
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    /* ---------- measure available square ---------- */
    useLayoutEffect(() => {
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

        measure();                                   // first run
        const ro = new ResizeObserver(measure);
        ro.observe(contentRef.current);
        return () => ro.disconnect();
    }, []);

    /* ---------- (re)draw QR whenever `side` changes ---------- */
    useEffect(() => {
        if (!side) return;                           // skip until measured

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
                width: side * dpr,                      // physical pixels
            });

            setQrUrl(url);
        })();
    }, [side]);

    /* ---------- render ---------- */
    return (
        <IonPage>
            <IonHeader ref={headerRef}>
                <IonToolbar><IonTitle>Show this QR</IonTitle></IonToolbar>
            </IonHeader>

            <IonContent ref={contentRef}>
                {/* intro paragraph – centred by global CSS rule */}
                <div ref={introRef}>
                    <IonList>
                        <IonItem lines="none">
                            <IonText>
                                <p style={{ marginBlock: 12 }}>
                                    Ask a device that has a camera to open&nbsp;
                                    <em>Scan&nbsp;new&nbsp;device</em>&nbsp;and aim at this code.
                                    Pairing will finish automatically.
                                </p>
                            </IonText>
                        </IonItem>
                    </IonList>
                </div>

                {/* crisp QR that redraws on every content resize */}
                {qrUrl && (
                    <img
                        src={qrUrl}
                        alt="pairing qr"
                        width={side}
                        height={side}
                        style={{ width: side, height: side }}
                    />
                )}

                {/* first-device footer */}
                <div ref={footerRef} style={{ marginBlockStart: 28 }}>
                    <IonText>
                        <p>
                            <strong>New here?</strong> If this is your first welliuᴍ device,
                            you don’t need to scan anything.
                        </p>
                    </IonText>
                    <IonButton
                        fill="outline"
                        expand="block"
                        onClick={() =>
                            onFirstDevice ? onFirstDevice() : (window.location.hash = '#/')
                        }
                    >
                        This is my first welliuᴍ device
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default JoinPairingScreen;
