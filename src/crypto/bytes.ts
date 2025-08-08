// src/crypto/bytes.ts
export function buf(v: ArrayBuffer | ArrayBufferView): ArrayBuffer {
    if (v instanceof ArrayBuffer) return v;
    const ab = v.buffer as ArrayBuffer | SharedArrayBuffer;
    const start = v.byteOffset;
    const len = v.byteLength;

    if (ab instanceof ArrayBuffer) return ab.slice(start, start + len);
    // SharedArrayBuffer path: copy into a fresh ArrayBuffer
    const out = new Uint8Array(len);
    out.set(new Uint8Array(ab, start, len));
    return out.buffer;
}


export async function blobToText(b: Blob): Promise<string> {
    return await b.text();
}
export async function blobToBase64(b: Blob): Promise<string> {
    const ab = await b.arrayBuffer();
    const u8 = new Uint8Array(ab);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
}
