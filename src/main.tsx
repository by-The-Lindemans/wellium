// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SyncProvider } from './sync/SyncProvider';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeyManager } from './crypto/KeyManager';
import { loadKyberProvider } from './crypto/pq/loadKyber';

(async () => {
  const kem = await loadKyberProvider();
  if (kem) KeyManager.useKemProvider(kem);
  await KeyManager.installPreferredKem({ requirePQ: true });
})();

// StatusBar is a no-op on web; safe to try/catch
if (typeof window !== 'undefined') {
  StatusBar.setStyle({ style: Style.Light }).catch(() => { });
  StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => { });
}

/** Build a *valid* array of signaling URLs (comma-separated or single),
 * filtering out undefined/empty values so we never pass [undefined].
 */
const raw = import.meta.env.VITE_SIGNAL_URL as string | undefined;
const signalingUrls = (raw ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (signalingUrls.length === 0) {
  console.error('VITE_SIGNAL_URL is missing. Set it in .env(.development).');
}

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <SyncProvider signalingUrls={signalingUrls}>
      <App />
    </SyncProvider>
  </React.StrictMode>
);
