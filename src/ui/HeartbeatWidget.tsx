import * as React from 'react';
import { useSync } from '../sync/SyncProvider';

export default function HeartbeatWidget() {
    const { status, ymap } = useSync();
    const [age, setAge] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!ymap) { setAge(null); return; }

        const compute = () => {
            let latest = 0;
            // @ts-ignore – ymap is a Y.Map<any>
            ymap.forEach((v: unknown, k: string) => {
                if (k.startsWith('hb:') && typeof v === 'number') latest = Math.max(latest, v as number);
            });
            setAge(latest ? Date.now() - latest : null);
        };

        compute();
        const obs = () => compute();
        // @ts-ignore observe is available on Y.Map
        ymap.observe(obs);
        const t = setInterval(compute, 1000);
        return () => { try { /* @ts-ignore */ ymap.unobserve(obs); } catch { } clearInterval(t); };
    }, [ymap]);

    const caption =
        status !== 'connected'
            ? status
            : age == null
                ? 'no hb'
                : `${Math.round(age / 1000)}s`;

    const ok = status === 'connected' && age != null && age <= 5000;

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>
                {ok ? 'Online' : status !== 'connected' ? 'Connecting…' : 'Stale'}
            </div>
            <div style={{ opacity: 0.7, marginTop: 6 }}>Heartbeat: {caption}</div>
        </div>
    );
}
