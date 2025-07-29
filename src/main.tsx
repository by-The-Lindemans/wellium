import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SyncProvider } from './sync/SyncProvider';

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