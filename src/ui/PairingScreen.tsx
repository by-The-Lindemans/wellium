import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonSegment, IonSegmentButton, IonLabel,
    IonButton, IonTextarea, IonItem, IonList, IonText
} from '@ionic/react';
import QRCode from 'qrcode';

import { KeyManager } from '../crypto/KeyManager';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { sha256Base64Url } from '../sync/yjsSync';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

type Mode = 'join' | 'host';

const PairingScreen: React.FC<{
    // Optional: where to send the user if they tap “first device”
    onContinueOnboarding?: () => void;
}> = ({ onContinueOnboarding }) => {
    const [mode, setMode] = React.useState<Mode>('join'); // default first-screen: Join
    const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
    const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);

    // -------------------- JOIN MODE --------------------

    const [scanText, setScanText] = React.useState<string>('');
    const [joinBusy, setJoinBusy] = React.useState(false);
    const [joinMsg, setJoinMsg] = React.useState<string | null>(null);

    async function handleJoinFromPayload(payload: string) {
        setJoinBusy(true);
        setJoinMsg(null);
        try {
            const o = JSON.parse(payload);
            if (o.v !== 1 || !o.pairingSecret || !o.kemPk || !o.kemPkFp) {
                throw new Error('Invalid QR payload');
            }

            // Confirm fingerprint (safety check)
            const fp = await kyberFingerprintB64url(o.kemPk);
            if (fp !== o.kemPkFp) throw new Error('Peer fingerprint mismatch');

            // Save the pairing secret
            localStorage.setItem(SECRET_KEY, o.pairingSecret);

            // Derive the identity namespace (roomTag) from the secret
            const roomTag = (await sha256Base64Url(b64urlToBytes(o.pairingSecret))).slice(0, 16);

            // Store peer identity so this device can initiate
            const idStore = new IdentityStore(new CapacitorStorageAdapter());
            await idStore.savePeer(roomTag, { kemPkB64: o.kemPk, fingerprintB64: fp });

            setJoinMsg('Paired. You can close this screen; syncing will start momentarily.');
        } catch (e: any) {
            setJoinMsg(e?.message ?? String(e));
        } finally {
            setJoinBusy(false);
        }
    }

    // -------------------- HOST MODE --------------------

    const [hostBusy, setHostBusy] = React.useState(false);
    const [hostMsg, setHostMsg] = React.useState<string | null>(null);

    async function generateHostQr() {
        setHostBusy(true);
        setHostMsg(null);
        setQrDataUrl(null);
        try {
            // Ensure this device has a Kyber keypair and get public key
            const km = new KeyManager();
            const kemPk = await km.getLocalKemPublicKeyB64();
            const kemPkFp = await kyberFingerprintB64url(kemPk);

            // New random secret for the cluster
            const pairingSecret = generatePairingSecret();

            // Host should also store the secret so it can join the cluster
            localStorage.setItem(SECRET_KEY, pairingSecret);

            const payload = JSON.stringify({ v: 1, pairingSecret, kemPk, kemPkFp });

            // Render QR
            if (qrCanvasRef.current) {
                await QRCode.toCanvas(qrCanvasRef.current, payload, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    scale: 6
                });
                setQrDataUrl(qrCanvasRef.current.toDataURL());
            }
            setHostMsg('Show this QR on your primary device. The other device should scan it to join.');
        } catch (e: any) {
            setHostMsg(e?.message ?? String(e));
        } finally {
            setHostBusy(false);
        }
    }

    // Generate QR immediately when switching to Host
    React.useEffect(() => {
        if (mode === 'host') void generateHostQr();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // -------------------- UI --------------------

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Pair a device</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">

                {/* Mode selector */}
                <IonSegment value={mode} onIonChange={e => setMode(e.detail.value as Mode)}>
                    <IonSegmentButton value="join">
                        <IonLabel>Join</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="host">
                        <IonLabel>Host</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                {mode === 'join' && (
                    <>
                        <IonList>
                            <IonItem lines="none">
                                <IonText>
                                    <p style={{ marginTop: 12 }}>
                                        <strong>Adding this device to an existing welliuᴍ setup?</strong><br />
                                        Open welliuᴍ on your primary device and go to <em>Settings → Add a device</em>, then scan the QR it shows using this screen. If you can’t scan, paste the QR payload below.
                                    </p>
                                </IonText>
                            </IonItem>

                            <IonItem lines="none">
                                <IonTextarea
                                    value={scanText}
                                    autoGrow
                                    rows={6}
                                    label="Paste QR payload (JSON)"
                                    labelPlacement="stacked"
                                    placeholder='{"v":1,"pairingSecret":"...","kemPk":"...","kemPkFp":"..."}'
                                    onIonChange={e => setScanText(e.detail.value ?? '')}
                                />
                            </IonItem>
                        </IonList>

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <IonButton
                                onClick={() => handleJoinFromPayload(scanText)}
                                disabled={joinBusy || !scanText.trim()}
                            >
                                Pair from pasted payload
                            </IonButton>

                            {/* Optional: add a Scan button if/when you add a Capacitor barcode plugin */}
                            {/* <IonButton color="medium" onClick={openScanner}>Scan QR</IonButton> */}
                        </div>

                        {joinMsg && (
                            <p style={{ marginTop: 12 }}>
                                <IonText color={joinMsg.startsWith('Paired') ? 'success' : 'danger'}>
                                    {joinMsg}
                                </IonText>
                            </p>
                        )}

                        <div style={{ marginTop: 28 }}>
                            <IonText>
                                <p>
                                    <strong>New here?</strong> If this is your first welliuᴍ device, you don’t need to scan anything.
                                </p>
                            </IonText>
                            <IonButton
                                fill="outline"
                                onClick={() => {
                                    if (onContinueOnboarding) onContinueOnboarding();
                                    else {
                                        // Fallback: go to your first-run/onboarding route or main app
                                        // e.g., useHistory().replace('/onboarding');
                                        window.location.hash = '#/tab1';
                                    }
                                }}
                            >
                                This is my first welliuᴍ device
                            </IonButton>
                        </div>
                    </>
                )}

                {mode === 'host' && (
                    <>
                        <IonList>
                            <IonItem lines="none">
                                <IonText>
                                    <p style={{ marginTop: 12 }}>
                                        <strong>Primary device</strong><br />
                                        Show this QR on your primary device. Other devices should use <em>Add a device</em> to scan it.
                                    </p>
                                </IonText>
                            </IonItem>
                        </IonList>

                        <div style={{ display: 'grid', placeItems: 'center', marginTop: 12 }}>
                            <canvas ref={qrCanvasRef} />
                            {qrDataUrl && (
                                <img
                                    src={qrDataUrl}
                                    alt="pairing qr"
                                    style={{ marginTop: 12, width: 256, height: 256 }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <IonButton onClick={() => generateHostQr()} disabled={hostBusy}>
                                Regenerate
                            </IonButton>
                        </div>

                        {hostMsg && (
                            <p style={{ marginTop: 12 }}>
                                <IonText color={hostMsg.startsWith('Show') ? 'medium' : 'danger'}>
                                    {hostMsg}
                                </IonText>
                            </p>
                        )}
                    </>
                )}
            </IonContent>
        </IonPage>
    );
};

export default PairingScreen;
