import { LoopbackPeerAdapter } from './peerAdapter';

describe('LoopbackPeerAdapter', () => {
  it('should echo back any data sent', async () => {
    const adapter = new LoopbackPeerAdapter();
    await adapter.connect('dummy-peer-id');

    const payload = new Uint8Array([1, 2, 3, 4, 5]);

    const received = await new Promise<Uint8Array>((resolve) => {
      adapter.onMessage((data) => resolve(data));
      adapter.send(payload);
    });

    expect(received).toEqual(payload);
    adapter.close();
  });
});
