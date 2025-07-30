import { CapacitorStorageAdapter } from '../adapters/storageAdapterCapacitor';

const MASTER_KEY_ID = 'wellium/master-key-v1';

export type DerivedKeys = {
    aes: CryptoKey;   // AES-256-GCM for content
    hmac: CryptoKey;  // HMAC-SHA-256 for metadata/auth if you add it
    tag: string;      // short base64url tag for feed namespacing
};

const ENC_SALT = new TextEncoder().encode('wellium:enc:v1');
const MAC_SALT = new TextEncoder().encode('wellium:mac:v1');

function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}
export function bytesToB64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number) {
    const ikm = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, ikm, len * 8);
    return new Uint8Array(bits);
}

// Public: derive deterministic keys from the 32-byte pairing secret (base64url).
export async function deriveKeysFromSecret(secretB64: string): Promise<DerivedKeys> {
    const secret = b64urlToBytes(secretB64);

    const enc = await hkdf(secret, ENC_SALT, new TextEncoder().encode('aes-gcm'), 32);
    const mac = await hkdf(secret, MAC_SALT, new TextEncoder().encode('hmac'), 32);

    const aes = await crypto.subtle.importKey('raw', enc, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const hmac = await crypto.subtle.importKey('raw', mac, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    const digest = await crypto.subtle.digest('SHA-256', secret);
    const tag = bytesToB64url(new Uint8Array(digest)).slice(0, 16);

    return { aes, hmac, tag };
}

// Optional: device-local master key. Use this only for encrypting the local cache;
// do not use it for cross-device data because other devices cannot decrypt it
// unless you explicitly export and import it.
export class KeyManager {
    private storage = new CapacitorStorageAdapter();
    private cached?: CryptoKey;

    async ensureMasterKey(): Promise<CryptoKey> {
        if (this.cached) return this.cached;

        const jwkB = await this.storage.loadBlob(MASTER_KEY_ID).catch(() => undefined);
        if (jwkB) {
            const jwk = JSON.parse(new TextDecoder().decode(jwkB));
            this.cached = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
            return this.cached;
        }

        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const jwk = await crypto.subtle.exportKey('jwk', key);
        await this.storage.saveBlob(MASTER_KEY_ID, new TextEncoder().encode(JSON.stringify(jwk)));
        this.cached = key;
        return key;
    }

    async clearMasterKey(): Promise<void> {
        this.cached = undefined;
        await this.storage.saveBlob(MASTER_KEY_ID, new Uint8Array([])).catch(() => { });
    }

    async getKeyForStorage(): Promise<CryptoKey> {
        return this.ensureMasterKey();
    }
}