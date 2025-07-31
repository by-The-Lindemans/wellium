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

if (typeof window !== 'undefined') {
  StatusBar.setStyle({ style: Style.Light }).catch(() => { });
  StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => { });
}

const signal = import.meta.env.VITE_SIGNAL_URL;
if (!signal) {
  console.error('VITE_SIGNAL_URL is missing. Set it in .env.development.');
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <SyncProvider signalingUrls={[import.meta.env.VITE_SIGNAL_URL]}>
      <App />
    </SyncProvider>
  </React.StrictMode>
);