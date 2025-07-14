import Peer, { DataConnection, PeerJSOption } from 'peerjs';
import { customAlphabet } from 'nanoid';
import { PeerAdapter } from './peerAdapter';

const genId = customAlphabet('1234567890abcdef', 16);

/* resolve signalling settings once, throw if unsafe */
function getSignalOptions(): PeerJSOption {
  const host  = import.meta.env.VITE_SIGNAL_HOST;
  const port  = Number(import.meta.env.VITE_SIGNAL_PORT);
  const path  = import.meta.env.VITE_SIGNAL_PATH ?? '/';
  const key   = import.meta.env.VITE_SIGNAL_KEY  ?? 'wellium';

  /* developer convenience: allow implicit localhost relay */
  if (!host && location.hostname === 'localhost') {
    return { host: 'localhost', port: 9000, path: '/', key: 'dev', secure: false };
  }

  /* production safety: refuse to run without explicit relay */
  if (!host || Number.isNaN(port)) {
    throw new Error(
      'Signalling server missing; set VITE_SIGNAL_HOST and VITE_SIGNAL_PORT'
    );
  }

  return { host, port, path, key, secure: true };
}

export class PeerJSPeerAdapter implements PeerAdapter {
  private peer!: Peer;
  private conn?: DataConnection;
  private listener?: (d: Uint8Array) => void;

  async connect(remoteId?: string): Promise<void> {
    if (!this.peer) {
      this.peer = new Peer(genId(), getSignalOptions());
      this.peer.on('connection', c => this.attach(c));
      await new Promise(res => this.peer.on('open', () => res(undefined)));
    }
    if (remoteId) {
      this.attach(this.peer.connect(remoteId));
    }
  }

  send(data: Uint8Array): void {
    if (this.conn?.open) this.conn.send(data);
  }

  onMessage(cb: (d: Uint8Array) => void): void {
    this.listener = cb;
  }

  close(): void {
    this.conn?.close();
    this.peer?.destroy();
  }

  get localId(): string {
    return this.peer.id;
  }

  private attach(conn: DataConnection): void {
    this.conn = conn;
    conn.on('data', d => {
      const arr = new Uint8Array(d as ArrayBuffer);
      this.listener?.(arr);
    });
  }
}
