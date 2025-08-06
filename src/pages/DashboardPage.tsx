import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { settingsOutline } from 'ionicons/icons';

const widgets = [
    { id: 'w1', title: 'Sync status' },
    { id: 'w2', title: 'Recent files' },
    { id: 'w3', title: 'Connected peers' },
    { id: 'w4', title: 'Storage usage' },
];

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    {/* spacer so the absoluted title stays visually centered */}
                    <IonButtons slot="start"><div style={{ width: 40 }} /></IonButtons>

                    <IonTitle className="dashboard-title">welliuᴍ</IonTitle>

                    <IonButtons slot="end">
                        <IonButton onClick={() => navigate('/settings')}>
                            <IonIcon icon={settingsOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                <IonGrid fixed>
                    <IonRow>
                        {widgets.map(w => (
                            <IonCol key={w.id} size="12" sizeMd="6" sizeLg="4">
                                <IonCard>
                                    <IonCardHeader>
                                        <IonCardTitle>{w.title}</IonCardTitle>
                                    </IonCardHeader>
                                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p>Widget body</p>
                                    </div>
                                </IonCard>
                            </IonCol>
                        ))}
                    </IonRow>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default DashboardPage;
