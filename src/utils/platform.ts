// src/utils/platform.ts
import { Capacitor } from '@capacitor/core';

/** True only on native mobile where the plugin exists. */
export function canOpenCamera(): boolean {
    // Guard on plugin + platform. (Electron/web will return false)
    return (
        Capacitor.isPluginAvailable('BarcodeScanner') &&
        (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android')
    );
}
