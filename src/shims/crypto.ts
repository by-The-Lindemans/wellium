// Minimal shim so packages that `import { webcrypto } from 'crypto'` work in the browser
export const webcrypto: Crypto = (globalThis as any).crypto;
export default (globalThis as any).crypto;