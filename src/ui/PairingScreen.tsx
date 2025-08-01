import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonSegment, IonSegmentButton, IonLabel,
    IonButton, IonTextarea, IonItem, IonList, IonText
} from '@ionic/react';
import QRCode from 'qrcode';
import { BarcodeScanner } from '@capacitor/barcode-scanner';

import { KeyManager } from '../crypto/KeyManager';
import { IdentityStore, kyberFingerprintB64url } from '../crypto/identity';
import { generatePairingSecret } from '../sync/SyncProvider';
import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';
import { sha256Base64Url } from '../sync/yjsSync';

/**
 * This screen can be reached from two places:
 *  - onboarding flow: user is adding *this* device to an existing cluster (only JOIN allowed)
 *  - settings → Add a device: user wants to show a QR so a *second* device can join (only HOST allowed)
 */
export type Origin = 'onboarding' | 'settings';

const SECRET_KEY = 'welliuᴍ/pairing-secret';

function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

// Utility: keep a square that is 90% of the short screen edge and updates on resize
function useSquareSide(pct = 0.9) {
    const [side, setSide] = React.useState(() =>
        Math.floor(Math.min(window.innerWidth, window.innerHeight) * pct)
    );
    React.useEffect(() => {
        function handle() {
            setSide(Math.floor(Math.min(window.innerWidth, window.innerHeight) * pct));
        }
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
    }, [pct]);
    return side;
}

type Mode = 'join' | 'host';

const PairingScreen: React.FC<{
    origin: Origin;
    onContinueOnboarding?: () => void;
}> = ({ origin, onContinueOnboarding }) => {
    // ------------------------------------------------------------
    //  Mode handling – only one mode is allowed based on origin
    // ------------------------------------------------------------
    const allowedModes: readonly Mode[] = origin === 'settings' ? ['host'] : ['join'];
    const [mode, setMode] = React.useState<Mode>(allowedModes[0]);

    // When only one mode is possible, hide the segment selector
    const showModeSelector = allowedModes.length === 2;

    // ------------------------------------------------------------
    //  Host state
    // ------------------------------------------------------------
    const side = useSquareSide();
    const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
    const [hostBusy, setHostBusy] = React.useState(false);
    const [hostMsg, setHostMsg] = React.useState<string | null>(null);

    async function generateHostQr() {
        setHostBusy(true);
        setHostMsg(null);
        setQrDataUrl(null);
        try {
            const km = new KeyManager();
            const kemPk = await km.getLocalKemPublicKeyB64();
            const kemPkFp = await kyberFingerprintB64url(kemPk);
            const pairingSecret = generatePairingSecret();
            localStorage.setItem(SECRET_KEY, pairingSecret);

            const payload = JSON.stringify({ v: 1, pairingSecret, kemPk, kemPkFp });

            if (qrCanvasRef.current) {
                await QRCode.toCanvas(qrCanvasRef.current, payload, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    width: side,
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

    // regenerate QR when side changes (orientation) or on mode entry
    React.useEffect(() => {
        if (mode === 'host') void generateHostQr();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, side]);

    // ------------------------------------------------------------
    //  Join state – camera with fallback to paste
    // ------------------------------------------------------------
    const [scanText, setScanText] = React.useState('');
    const [joinBusy, setJoinBusy] = React.useState(false);
    const [joinMsg, setJoinMsg] = React.useState<string | null>(null);

    const [scanFailures, setScanFailures] = React.useState(0);
    const [cameraAvailable, setCameraAvailable] = React.useState(true);

    async function openScanner() {
        try {
            await BarcodeScanner.checkPermission({ force: true });
            const result = await BarcodeScanner.startScan();
            if (result.hasContent) {
                await handleJoinFromPayload(result.content);
            } else {
                throw new Error('No QR detected');
            }
        } catch (err: any) {
            const unimpl = err?.message?.includes('Unimplemented');
            setScanFailures(n => n + 1);
            if (unimpl || scanFailures + 1 >= 3) {
                setCameraAvailable(false); // fallback to paste UI
            }
        } finally {
            // Stop camera if it was started
            await BarcodeScanner.stopScan();
        }
    }

    async function handleJoinFromPayload(payload: string) {
        setJoinBusy(true);
        setJoinMsg(null);
        try {
            const o = JSON.parse(payload);
            if (o.v !== 1 || !o.pairingSecret || !o.kemPk || !o.kemPkFp) {
                throw new Error('Invalid QR payload');
            }
            const fp = await kyberFingerprintB64url(o.kemPk);
            if (fp !== o.kemPkFp) throw new Error('Peer fingerprint mismatch');

            localStorage.setItem(SECRET_KEY, o.pairingSecret);
            const roomTag = (await sha256Base64Url(b64urlToBytes(o.pairingSecret))).slice(0, 16);
            const idStore = new IdentityStore(new CapacitorStorageAdapter());
            await idStore.savePeer(roomTag, { kemPkB64: o.kemPk, fingerprintB64: fp });

            setJoinMsg('Paired. You can close this screen; syncing will start momentarily.');
        } catch (e: any) {
            setJoinMsg(e?.message ?? String(e));
        } finally {
            setJoinBusy(false);
        }
    }

    // ------------------------------------------------------------
    //  UI
    // ------------------------------------------------------------
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Pair a device</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {/* Mode selector only if both modes are possible */}
                {showModeSelector && (
                    <IonSegment value={mode} onIonChange={e => setMode(e.detail.value as Mode)}>
                        <IonSegmentButton value="join">
                            <IonLabel>Join</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="host">
                            <IonLabel>Host</IonLabel>
                        </IonSegmentButton>
                    </IonSegment>
                )}

                {/* ---------------- JOIN ---------------- */}
                {mode === 'join' && (
                    <>
                        <IonList>
                            <IonItem lines="none">
                                <IonText>
                                    <p style={{ marginTop: 12 }}>
                                        <strong>Adding this device to an existing welliuᴍ setup?</strong><br />
                                        Open welliuᴍ on your primary device and go to <em>Settings → Add a device</em>, then scan the QR it shows using this screen.
                                    </p>
                                </IonText>
                            </IonItem>
                        </IonList>

                        {cameraAvailable ? (
                            <>
                                <IonButton onClick={openScanner} disabled={joinBusy} expand="block" style={{ marginTop: 12 }}>
                                    Scan QR
                                </IonButton>
                                {scanFailures > 0 && (
                                    <p style={{ marginTop: 12 }}><IonText color="medium">Scan failed; you can try again or wait to paste the code.</IonText></p>
                                )}
                            </>
                        ) : (
                            <>
                                <IonList>
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
                                <IonButton
                                    onClick={() => handleJoinFromPayload(scanText)}
                                    disabled={joinBusy || !scanText.trim()}
                                    style={{ marginTop: 12 }}
                                    expand="block"
                                >
                                    Pair from pasted payload
                                </IonButton>
                            </>
                        )}

                        {joinMsg && (
                            <p style={{ marginTop: 12 }}>
                                <IonText color={joinMsg.startsWith('Paired') ? 'success' : 'danger'}>
                                    {joinMsg}
                                </IonText>
                            </p>
                        )}

                        {origin === 'onboarding' && (
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
                                        else window.location.hash = '#/tab1';
                                    }}
                                >
                                    This is my first welliuᴍ device
                                </IonButton>
                            </div>
                        )}
                    </>
                )}

                {/* ---------------- HOST ---------------- */}
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
                            <canvas ref={qrCanvasRef} style={{ width: side, height: side }} />
                            {qrDataUrl && (
                                <img src={qrDataUrl} alt="pairing qr" style={{ marginTop: 12, width: side, height: side }} />
                            )}
                        </div>

                        <IonButton onClick={generateHostQr} disabled={hostBusy} expand="block" style={{ marginTop: 16 }}>
                            Regenerate
                        </IonButton>

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
