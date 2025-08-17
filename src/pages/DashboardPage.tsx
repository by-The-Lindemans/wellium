// src/pages/DashboardPage.tsx
import * as React from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { settingsOutline } from 'ionicons/icons';
import { useSync } from '../sync/SyncProvider';
import * as Y from 'yjs';

const widgets = [
    { id: 'w1', title: 'Sync status' },
    { id: 'w2', title: 'Recent files' },
    { id: 'w3', title: 'Connected peers' },
    { id: 'w4', title: 'Storage usage' },
];

/** Minimal heartbeat widget that reads from the shared 'sys' map
 *  Keys are 'hb:<clientID>' => timestamp (ms); fresh = <10s
 *  Shows count and a list of device IDs, marking the current device.
 */
function HeartbeatCard() {
    const { ymap, ydoc, status } = useSync();
    const [rows, setRows] = React.useState<{ id: string; ts: number; fresh: boolean }[]>([]);

    React.useEffect(() => {
        if (!ymap) { setRows([]); return; }

        const compute = () => {
            const out: { id: string; ts: number; fresh: boolean }[] = [];
            const now = Date.now();

            // Iterate current entries
            (ymap as Y.Map<any>).forEach((v: any, k: string) => {
                if (typeof k === 'string' && k.startsWith('hb:') && typeof v === 'number') {
                    const id = k.slice(3);
                    const fresh = now - v < 10_000; // seen within 10s
                    out.push({ id, ts: v, fresh });
                }
            });

            out.sort((a, b) => a.id.localeCompare(b.id));
            setRows(out);
        };

        // Update on map changes and also on an interval to refresh freshness color
        (ymap as Y.Map<any>).observe(compute);
        const tick = setInterval(compute, 2000);
        compute();

        return () => {
            try { (ymap as Y.Map<any>).unobserve(compute); } catch { }
            clearInterval(tick);
        };
    }, [ymap]);

    const me = ydoc?.clientID != null ? String(ydoc.clientID) : '';
    const freshCount = rows.filter(r => r.fresh).length;

    return (
        <IonCard>
            <IonCardHeader>
                <IonCardTitle>Devices online: {freshCount}</IonCardTitle>
            </IonCardHeader>

            <div style={{ padding: '8px 12px', maxHeight: 160, overflowY: 'auto' }}>
                {rows.length === 0 ? (
                    <p style={{ margin: 0, opacity: 0.7 }}>
                        {status !== 'connected' ? 'Connecting…' : 'No heartbeats yet'}
                    </p>
                ) : (
                    <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                        {rows.map(({ id, fresh }) => (
                            <li key={id} style={{ lineHeight: 1.6 }}>
                                <span style={{ color: fresh ? '#2ecc71' : '#e67e22', fontSize: '1.1em' }}>●</span>{' '}
                                {id}{id === me ? ' (this device)' : ''}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </IonCard>
    );
}

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
                                {w.id === 'w1' ? (
                                    // Replace only the first card with the heartbeat widget
                                    <HeartbeatCard />
                                ) : (
                                    <IonCard>
                                        <IonCardHeader>
                                            <IonCardTitle>{w.title}</IonCardTitle>
                                        </IonCardHeader>
                                        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <p>Widget body</p>
                                        </div>
                                    </IonCard>
                                )}
                            </IonCol>
                        ))}
                    </IonRow>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default DashboardPage;
