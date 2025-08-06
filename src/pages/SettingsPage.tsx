// src/pages/SettingsPage.tsx
import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent, IonButton, IonList, IonItem, IonLabel
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';

const isMobileNative = () => {
    const p = Capacitor.getPlatform();
    return p === 'ios' || p === 'android';
};

const SettingsPage: React.FC = () => {
    const supportsScan = isMobileNative();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/" />
                    </IonButtons>
                    <IonButtons slot="end">
                        <div className="toolbar-spacer" />
                    </IonButtons>
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">

                {supportsScan && (
                    <IonButton expand="block" routerLink="/pair/scan" routerDirection="forward">
                        Add / Scan device
                    </IonButton>
                )}

                {!supportsScan && (
                    <IonList lines="none">
                        <IonItem>
                            <IonLabel className="ion-text-wrap">
                                This device does not support scanning. Use a mobile device to scan the QR.
                            </IonLabel>
                        </IonItem>
                    </IonList>
                )}

                {/* ---- Dev-only utilities to test Splash/QR without quitting Electron ---- */}
                {import.meta.env.DEV && (
                    <>
                        <div style={{ height: 24 }} />
                        <IonList inset>
                            <IonItem>
                                <IonLabel>Developer Utilities</IonLabel>
                            </IonItem>
                        </IonList>

                        <IonButton expand="block" color="medium"
                            onClick={() => {
                                // Just re-run StartGate (Splash) for this session
                                sessionStorage.removeItem('wl/splash-shown');
                                location.hash = '#/guard';
                                location.reload();
                            }}>
                            Cold restart (show Splash next)
                        </IonButton>

                        <IonButton expand="block" color="warning"
                            onClick={() => {
                                // Force first-run flow (Splash + QR)
                                sessionStorage.removeItem('wl/splash-shown');
                                localStorage.removeItem('wl/onboarding-ok');
                                localStorage.removeItem('wellium/pairing-secret');
                                location.hash = '#/guard';
                                location.reload();
                            }}>
                            Reset onboarding & pairing (show QR next)
                        </IonButton>
                    </>
                )}
            </IonContent>
        </IonPage>
    );
};

export default SettingsPage;
