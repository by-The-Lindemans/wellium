import type { KemProvider, KemCapsule, KemSharedSecret } from "../KeyManager";

export async function loadKyberProvider(): Promise<KemProvider> {
    const mod = await import("mlkem");
    const { MlKem1024 } = mod;

    class MlKem1024Provider implements KemProvider {
        readonly name = "ML-KEM-1024";
        private enc = new MlKem1024();
        private dec = new MlKem1024();

        async generateKeyPair(): Promise<{ publicRaw: Uint8Array; privateBytes: Uint8Array }> {
            const [pk, sk] = await this.enc.generateKeyPair();
            // mlkem returns Uint8Array already
            return { publicRaw: new Uint8Array(pk), privateBytes: new Uint8Array(sk) };
        }

        async encapsulate(peerPublicRaw: Uint8Array): Promise<{ shared: KemSharedSecret; capsule: KemCapsule }> {
            const [ct, ss] = await this.enc.encap(peerPublicRaw);
            return { capsule: new Uint8Array(ct), shared: new Uint8Array(ss) };
        }

        async decapsulate(capsule: Uint8Array, privateBytes: Uint8Array): Promise<KemSharedSecret> {
            const ss = await this.dec.decap(capsule, privateBytes);
            return new Uint8Array(ss);
        }
    }

    return new MlKem1024Provider();
}
