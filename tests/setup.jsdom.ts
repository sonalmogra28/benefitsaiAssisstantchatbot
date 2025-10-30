// JSDOM: provide global Web Crypto for libs expecting it
import { webcrypto, randomUUID, randomBytes } from 'node:crypto';
import '@testing-library/jest-dom/vitest';

// @ts-ignore
const g: any = globalThis;
g.crypto ||= webcrypto;
if (!g.crypto.randomUUID) g.crypto.randomUUID = randomUUID ?? (() => {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const s = [...b].map((x,i)=> (i===4||i===6||i===8||i===10?'-':'')+x.toString(16).padStart(2,'0')).join('');
  return s;
});
// Non-standard shim some libs read:
if (!g.crypto.random) g.crypto.random = Math.random;
