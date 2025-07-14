import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// local certificate generated with mkcert relay.localhost
const httpsOptions = {
  key:  readFileSync('certs/relay.localhost-key.pem'),
  cert: readFileSync('certs/relay.localhost.pem')
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      adapters: resolve(__dirname, 'src/adapters'),
      domain:   resolve(__dirname, 'src/domain')
    }
  },
  server: {
    https: httpsOptions,
    host: 'localhost',
    port: 5173
  },
  envPrefix: 'VITE_'  // forward signalling variables to import.meta.env
});
