// Default ON in dev and in native WebView; can still be forced in production via localStorage.DEBUG_*='1'
export const IS_DEV =
    Boolean((import.meta as any)?.env?.DEV) ||
    // Capacitor native WebView uses "capacitor:" scheme
    (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:');

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
