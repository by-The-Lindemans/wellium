import React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonIcon, IonContent
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { arrowBack } from 'ionicons/icons';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    {/* Back using React Router (works with HashRouter) */}
                    <IonButtons slot="start">
                        <IonButton onClick={() => navigate(-1)}>
                            <IonIcon icon={arrowBack} />
                        </IonButton>
                    </IonButtons>

                    {/* spacer to keep title centered */}
                    <IonButtons slot="end"><div style={{ width: 40 }} /></IonButtons>
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonButton expand="block" onClick={() => navigate('/pairing')}>
                    Add / Scan device
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default SettingsPage;
