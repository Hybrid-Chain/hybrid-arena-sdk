import {createHash,createHmac,randomBytes} from 'node:crypto';
import type {Json} from './types.js';
export const MAX_BODY_BYTES = 262144;
export const CONTRACT_VERSION = '2026-10-23.2';
export const newId = (): string => randomBytes(16).toString('hex');
export const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Deliberately small cross-language JSON profile; integer-valued game facts only. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 20) throw new Error('JSON nesting exceeds contract limit');
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Safe integer required');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    if (!value.isWellFormed()) throw new Error('Invalid Unicode string');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(v => canonicalJson(v, depth + 1)).join(',') + ']';
  if (typeof value === 'object' && value && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    const keys = Object.keys(value).sort();
    if (keys.some(k => !/^[A-Za-z0-9_.:-]{1,96}$/.test(k))) throw new Error('ASCII contract keys required');
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, Json>)[k], depth + 1)).join(',') + '}';
  }
  throw new Error('Unsupported JSON value');
}

export function validBaseUrl(base: string): string {
  const u = new URL(base);
  if (u.username || u.password || u.pathname !== '/' || u.search || u.hash ||
    !(['https:'].includes(u.protocol) || u.protocol === 'http:' && ['127.0.0.1','[::1]'].includes(u.hostname))) {
    throw new Error('Explicit HTTPS origin or literal loopback HTTP origin required');
  }
  return u.origin;
}

export function signRequest(input: {
  method: string; path: string; publisherId: string; environment: string;
  keyId: string; secretHex: string; body: string; timestamp?: string; nonce?: string;
}): Record<string, string> {
  if (!/^[a-f0-9]{64}$/.test(input.secretHex) || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(input.keyId) ||
    !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(input.publisherId) || input.environment !== 'sandbox' ||
    !/^\/v1\/(?:matches(?:\/[a-f0-9]{32}\/events)?|receipts\/[a-f0-9]{32})$/.test(input.path) ||
    !['GET','POST'].includes(input.method)) throw new Error('Invalid signing parameters');
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));
  const nonce = input.nonce ?? newId();
  if (!/^\d{1,12}$/.test(timestamp) || !/^[a-f0-9]{32}$/.test(nonce)) throw new Error('Invalid clock or nonce');
  const canonical = ['ARENA-GAME-HMAC-V1',input.method,input.path,input.publisherId,input.environment,timestamp,nonce,sha256(input.body)].join('\n');
  return {
    'X-Arena-Key-Id': input.keyId, 'X-Arena-Publisher': input.publisherId,
    'X-Arena-Environment': input.environment, 'X-Arena-Timestamp': timestamp,
    'X-Arena-Nonce': nonce,
    'X-Arena-Signature': createHmac('sha256', Buffer.from(input.secretHex,'hex')).update(canonical).digest('hex')
  };
}
