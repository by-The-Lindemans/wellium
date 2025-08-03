// ─────────────────────────────────────────────
// src/pages/DashboardPage.tsx
// ─────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonIcon, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle,
    IonModal
} from '@ionic/react';
import { settingsOutline, arrowBack } from 'ionicons/icons';
import HostPairingScreen from '../ui/HostPairingScreen';       // your existing QR view

/* ---------- sample widgets ---------- */
const widgets = [
    { id: 'sync', title: 'Sync status' },
    { id: 'files', title: 'Recent files' },
    { id: 'peers', title: 'Connected peers' },
    { id: 'storage', title: 'Storage usage' },
];

const DashboardPage: React.FC = () => {
    /* first-level Settings sheet */
    const [settingsOpen, setSettingsOpen] = useState(false);
    /* nested Host-Pairing modal */
    const [pairingOpen, setPairingOpen] = useState(false);

    /* Needed for iOS card presentation */
    const presentingEl = useRef<HTMLElement | null>(null);

    return (
        <IonPage ref={el => (presentingEl.current = el)}>

            {/* ─ HEADER ───────────────────── */}
            <IonHeader>
                <IonToolbar>

                    {/* spacer keeps title perfectly centred */}
                    <IonButtons slot="start">
                        <div style={{ width: 44, height: 44 }} />
                    </IonButtons>

                    <IonTitle className="dashboard-title">welliuᴍ</IonTitle>

                    <IonButtons slot="end">
                        <IonButton aria-label="Settings" onClick={() => setSettingsOpen(true)}>
                            <IonIcon icon={settingsOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ─ MAIN GRID ────────────────── */}
            <IonContent>
                <IonGrid fixed>
                    <IonRow>
                        {widgets.map(w => (
                            <IonCol key={w.id} size="12" sizeMd="6" sizeLg="4">
                                <IonCard>
                                    <IonCardHeader>
                                        <IonCardTitle>{w.title}</IonCardTitle>
                                    </IonCardHeader>
                                    <div style={{
                                        height: 120,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <p>Widget body</p>
                                    </div>
                                </IonCard>
                            </IonCol>
                        ))}
                    </IonRow>
                </IonGrid>
            </IonContent>

            {/* ─ SETTINGS MODAL ───────────── */}
            <IonModal
                isOpen={settingsOpen}
                onDidDismiss={() => setSettingsOpen(false)}
                presentingElement={presentingEl.current ?? undefined}
            >
                <IonPage>
                    <IonHeader>
                        <IonToolbar>
                            <IonTitle className="settings-title">Settings</IonTitle>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent className="ion-padding">
                        <IonButton expand="block" onClick={() => setPairingOpen(true)}>
                            Add / Scan device
                        </IonButton>
                    </IonContent>
                </IonPage>
            </IonModal>

            {/* ─ HOST-PAIRING (nested) ────── */}
            <IonModal
                isOpen={pairingOpen}
                onDidDismiss={() => setPairingOpen(false)}
                presentingElement={presentingEl.current ?? undefined}
            >
                <HostPairingScreen onClose={() => setPairingOpen(false)} />
            </IonModal>
        </IonPage>
    );
};

export default DashboardPage;
