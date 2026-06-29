import { createRequire } from 'node:module';
import type Redis from 'ioredis';

const require = createRequire(import.meta.url);
const redis = require('../redis.ts').default as Redis;

export const KEYBOARD_SESSION_TTL_SECONDS = 24 * 60 * 60;

// Chuyển secret key thành Buffer
const encodedHeader = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

async function createSignature(input: string, secret: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(input)
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export interface KeyboardSessionPayload {
  sub: string;
  role: string;
  sid: string;
  did?: string;
  exp: number;
  iat: number;
}

interface StoredKeyboardSession {
  sid: string;
  deviceId?: string;
}

/**
 * Ký JWT cho bàn phím với thời hạn 24 giờ
 */
export async function signKeyboardToken(
  payload: { sub: string; role: string; sid: string; did?: string },
  ttlSeconds = KEYBOARD_SESSION_TTL_SECONDS
): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || 'sale_keyboard_secret_key_123';
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: KeyboardSessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const input = `${encodedHeader}.${body}`;
  const signatureBuffer = await createSignature(input, secret);
  const signature = Buffer.from(signatureBuffer).toString('base64url');

  return `${input}.${signature}`;
}

function isKeyboardSessionPayload(value: unknown): value is KeyboardSessionPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<KeyboardSessionPayload>;
  return (
    typeof payload.sub === 'string' &&
    payload.sub.length > 0 &&
    typeof payload.role === 'string' &&
    payload.role.length > 0 &&
    typeof payload.sid === 'string' &&
    payload.sid.length > 0 &&
    Number.isInteger(payload.iat) &&
    Number.isInteger(payload.exp) &&
    (payload.did === undefined || typeof payload.did === 'string')
  );
}

function parseStoredKeyboardSession(value: string | null): StoredKeyboardSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredKeyboardSession>;
    if (typeof parsed.sid === 'string' && parsed.sid.length > 0) {
      return {
        sid: parsed.sid,
        deviceId: typeof parsed.deviceId === 'string' && parsed.deviceId.length > 0
          ? parsed.deviceId
          : undefined,
      };
    }
  } catch {
    // Backward compatibility: older deployments stored only the sid string.
  }
  return { sid: value };
}

export async function isKeyboardSessionActive(
  payload: Pick<KeyboardSessionPayload, 'sub' | 'sid' | 'did'>,
  getActiveSession: (key: string) => Promise<string | null> = (key) => redis.get(key),
): Promise<boolean> {
  const activeSession = parseStoredKeyboardSession(await getActiveSession(`session:${payload.sub}`));
  if (!activeSession || activeSession.sid !== payload.sid) return false;
  if (activeSession.deviceId && payload.did && activeSession.deviceId !== payload.did) return false;
  return true;
}

/**
 * Xác thực token bàn phím và kiểm tra sid trên Redis
 */
export async function verifyKeyboardToken(
  token: string,
  options: {
    getActiveSession?: (key: string) => Promise<string | null>;
  } = {},
): Promise<KeyboardSessionPayload | null> {
  if (!token || token.length > 4096) return null;

  try {
    const secret = process.env.ADMIN_SESSION_SECRET || 'sale_keyboard_secret_key_123';
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    if (header !== encodedHeader) return null;

    const suppliedSignature = Buffer.from(signature, 'base64url');
    const expectedSignatureBuffer = await createSignature(`${header}.${body}`, secret);
    const expectedSignature = Buffer.from(expectedSignatureBuffer);

    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(new Uint8Array(suppliedSignature), new Uint8Array(expectedSignature))
    ) {
      return null;
    }

    const payload: unknown = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );
    if (!isKeyboardSessionPayload(payload)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null; // Token hết hạn
    }

    if (!(await isKeyboardSessionActive(payload, options.getActiveSession))) {
      console.warn(`Inactive keyboard session for user ${payload.sub}: token sid=${payload.sid}`);
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Error verifying keyboard token:', err);
    return null;
  }
}
