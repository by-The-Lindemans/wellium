import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

// mkcert cert for relay.localhost
const httpsOptions = {
  key: readFileSync('certs/relay.localhost-key.pem'),
  cert: readFileSync('certs/relay.localhost.pem')
};

// find the y-webrtc signaling server script without using package exports
function findYwsScript(): string {
  const candidates = [
    resolve(process.cwd(), 'node_modules/y-webrtc/bin/server.js'),
    resolve(process.cwd(), 'node_modules/y-webrtc/bin/y-webrtc.js'),
    resolve(process.cwd(), 'node_modules/y-webrtc/dist/server.cjs')
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  throw new Error(
    'Cannot locate y-webrtc signaling server script. Check node_modules/y-webrtc. ' +
    'Try: npm i y-webrtc, then verify bin/server.js exists.'
  );
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'y-webrtc-signaling-dev',
      apply: 'serve',
      configureServer(server) {
        const yws = findYwsScript();
        const child = spawn(process.execPath, [yws, '--port', '9001'], { stdio: 'inherit' });
        console.log('[yws] dev signaling on ws://127.0.0.1:9001 via /yws');
        server.httpServer?.once('close', () => { try { child.kill('SIGTERM'); } catch { } });
      }
    }
  ],
  resolve: {
    alias: {
      adapters: resolve(__dirname, 'src/adapters'),
      domain: resolve(__dirname, 'src/domain'),
      sync: resolve(__dirname, 'src/sync')
    }
  },
  server: {
    https: httpsOptions,
    host: 'relay.localhost',
    port: 8100,
    proxy: {
      '/yws': {
        target: 'ws://127.0.0.1:9001',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  envPrefix: 'VITE_'
});
