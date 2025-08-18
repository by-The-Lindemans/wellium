// src/dev/DiagPage.tsx
import * as React from 'react';

export default function DiagPage() {
    const [rows, setRows] = React.useState<any[]>([]);
    React.useEffect(() => {
        const tick = () => {
            const d: any = (window as any).WL_DIAG;
            setRows(d?.entries?.() || []);
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, []);
    return (
        <div style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            <h3>Diagnostics</h3>
            <button onClick={() => {
                const d: any = (window as any).WL_DIAG;
                const blob = new Blob([JSON.stringify(d?.entries?.() || [], null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wellium-diag-${Date.now()}.json`; a.click();
            }}>Download JSON</button>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{rows.map(e => JSON.stringify(e)).join('\n')}</pre>
        </div>
    );
}
