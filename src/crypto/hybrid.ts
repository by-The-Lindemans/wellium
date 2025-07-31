import { sha256 } from '@noble/hashes/sha256';

export async function hkdfExtractExpand(
    ikm: Uint8Array,
    salt: Uint8Array,
    info: Uint8Array,
    length: number
): Promise<Uint8Array> {
    // Use WebCrypto HKDF (preferred). Falls back to noble if needed.
    const subtle = crypto.subtle;
    const ikmKey = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        ikmKey,
        length * 8
    );
    return new Uint8Array(bits);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
}

export function b64url(u: Uint8Array): string {
    return btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlToBytes(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function sha256Bytes(...parts: Uint8Array[]): Uint8Array {
    return Uint8Array.from(sha256(concat(...parts)));
}
