export interface PeerAdapter {
  connect(peerId: string): Promise<void>;
  send(data: Uint8Array): void;
  onMessage(callback: (data: Uint8Array) => void): void;
  close(): void;
}

// A simple in-memory driver you can use for tests
export class LoopbackPeerAdapter implements PeerAdapter {
  private listener?: (data: Uint8Array) => void;

  async connect(_peerId: string) {
    // nothing to do for loopback
  }

  send(data: Uint8Array) {
    // echo back after a tick
    setTimeout(() => this.listener?.(data), 0);
  }

  onMessage(callback: (data: Uint8Array) => void) {
    this.listener = callback;
  }

  close() {
    // no resources to free
  }
}
