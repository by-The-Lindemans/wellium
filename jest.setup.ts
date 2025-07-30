// jest.setup.ts
import { webcrypto } from 'crypto';

// Provide crypto.subtle for AES-GCM in tests
Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true
});

// Provide TextEncoder/TextDecoder if the environment is missing them
// (Node 20 has them; this is a safe no-op there.)
if (!(globalThis as any).TextEncoder) {
    const { TextEncoder, TextDecoder } = require('util');
    Object.assign(globalThis as any, { TextEncoder, TextDecoder });
}
