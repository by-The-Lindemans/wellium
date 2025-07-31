export type KyberKeypair = { publicKey: Uint8Array; secretKey: Uint8Array };

export interface KyberProvider {
    readonly alg: 'kyber768' | 'kyber1024';
    generateKeypair(): Promise<KyberKeypair>;
    encapsulate(peerPublicKey: Uint8Array): Promise<{ ciphertext: Uint8Array; sharedSecret: Uint8Array }>;
    decapsulate(ciphertext: Uint8Array, mySecretKey: Uint8Array): Promise<Uint8Array>;
}
