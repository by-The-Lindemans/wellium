import Peer, { DataConnection } from 'peerjs';
import { customAlphabet } from 'nanoid';
import { PeerAdapter } from './peerAdapter';       // existing interface

const genId = customAlphabet('1234567890abcdef', 16);

export class PeerJSPeerAdapter implements PeerAdapter {
  private peer!: Peer;
  private conn?: DataConnection;
  private messageListener?: (d: Uint8Array) => void;

  async connect(remoteId?: string) {
    // create (or reuse) local Peer
    if (!this.peer) {
      this.peer = new Peer(genId());
      this.peer.on('connection', (c) => this.attachConn(c));
    }

    // if we’re dialing out, make the connection
    if (remoteId) {
      this.attachConn(this.peer.connect(remoteId));
    }

    // wait until peer is ready
    await new Promise<void>((res) => this.peer.on('open', () => res()));
  }

  send(data: Uint8Array) {
    this.conn?.open && this.conn.send(data);
  }

  onMessage(cb: (d: Uint8Array) => void) {
    this.messageListener = cb;
  }

  close() {
    this.conn?.close();  this.peer?.destroy();
  }

  /* ---------- helpers ---------- */
  private attachConn(c: DataConnection) {
    this.conn = c;
    c.on('data', (d) => this.messageListener?.(new Uint8Array(d as ArrayBuffer)));
  }

  /** expose my ID so UI can encode it into a QR */
  get localId() {
    return this.peer.id;
  }
}
