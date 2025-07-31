import { KeyManager, ensureKyberKem } from './KeyManager';

beforeAll(async () => {
    await ensureKyberKem();
});

test('ML-KEM wrap/unwrap master key', async () => {
    const A = new KeyManager();
    const B = new KeyManager();

    // Force both to create KEM keys
    const pkB64 = await B.getLocalKemPublicKeyB64();

    // A wraps its master key for B
    const payload = await A.exportWrappedForPeer(pkB64);

    // B installs it
    await B.importWrappedFromPeer(payload);

    // Optional: check that B can now encrypt at-rest (ensureMasterKey returns)
    const k = await B.getKeyForStorage();
    expect(k.type).toBe('secret');
});
