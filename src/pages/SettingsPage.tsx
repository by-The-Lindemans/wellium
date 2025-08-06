// src/pages/SettingsPage.tsx
import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonBackButton, IonContent,
    IonButton, IonList, IonItem, IonText
} from '@ionic/react';
import { canOpenCamera } from '../utils/platform';

const SettingsPage: React.FC = () => {
    const canScan = canOpenCamera();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {canScan ? (
                    <IonButton expand="block" routerLink="/pairing" routerDirection="forward">
                        Add / Scan device
                    </IonButton>
                ) : (
                    <IonList>
                        <IonItem lines="none">
                            <IonText>
                                <p>
                                    Scanning is only available on mobile. To add a device, open Wellium on an iOS/Android device and choose
                                    <em> Scan new device</em>.
                                </p>
                            </IonText>
                        </IonItem>
                    </IonList>
                )}
            </IonContent>
        </IonPage>
    );
};

export default SettingsPage;
