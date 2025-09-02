// Default ON in dev and native; also ON when served from localhost
export const IS_DEV = (() => {
    try {
        const viteDev = Boolean((import.meta as any)?.env?.DEV);
        const proto = typeof window !== 'undefined' ? window.location?.protocol : '';
        const host = typeof window !== 'undefined' ? window.location?.hostname : '';
        const isCap = proto === 'capacitor:' || Boolean((window as any)?.Capacitor?.isNativePlatform);
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        return viteDev || isCap || isLocal;
    } catch { return false; }
})();

function flag(k: string): boolean {
    try { return localStorage.getItem(k) === '1'; } catch { return false; }
}

export function dlog(scope: string, ...args: any[]) {
    if (IS_DEV || flag(`DEBUG_${scope.toUpperCase()}`)) {
        // include a short device id to make two-phone traces readable
        const id = (window as any).__WL_DEV_ID || (() => {
            const v = Math.random().toString(36).slice(2, 6);
            (window as any).__WL_DEV_ID = v;
            return v;
        })();
        console.log(`[${scope}]#${id}`, ...args);
    }
}
