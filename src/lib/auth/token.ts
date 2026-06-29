export const ADMIN_SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 60 * 60;

export type AdminRole = 'SUPER_ADMIN' | 'FINANCE' | 'SUPPORT' | 'READ_ONLY' | 'SALE';

export interface SessionPayload {
  sub: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

// Helpers dùng Web APIs thay vì Node.js Buffer để chạy được trong Next.js Edge Runtime (Middleware)
function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToString(base64url: string): string {
  const bytes = base64UrlToBytes(base64url);
  return new TextDecoder().decode(bytes);
}

const encodedHeader = stringToBase64Url(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
);

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const len = new TextEncoder().encode(secret).length;
  return len >= 32 ? secret : null;
}

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

function isAdminRole(value: unknown): value is AdminRole {
  return ['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY', 'SALE'].includes(
    String(value),
  );
}

function isValidPayload(value: unknown, now: number): value is SessionPayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<SessionPayload>;
  return (
    typeof payload.sub === 'string' &&
    payload.sub.length > 0 &&
    payload.sub.length <= 128 &&
    isAdminRole(payload.role) &&
    Number.isInteger(payload.iat) &&
    Number.isInteger(payload.exp) &&
    payload.iat! <= now + 60 &&
    payload.exp! > now &&
    payload.exp! - payload.iat! <= SESSION_TTL_SECONDS
  );
}

export async function signToken(
  payload: Pick<SessionPayload, 'sub' | 'role'>,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 bytes');
  }

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = stringToBase64Url(JSON.stringify(fullPayload));
  const input = `${encodedHeader}.${body}`;
  const signatureBuffer = await createSignature(input, secret);
  // Convert ArrayBuffer signature to base64url string
  const signatureBytes = new Uint8Array(signatureBuffer);
  const binSignature = String.fromCodePoint(...signatureBytes);
  const signature = btoa(binSignature)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${input}.${signature}`;
}

export async function verifyToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  const secret = getSessionSecret();
  if (!secret || token.length > 4096) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    if (header !== encodedHeader) return null;

    const suppliedSignature = base64UrlToBytes(signature);
    const expectedSignatureBuffer = await createSignature(`${header}.${body}`, secret);
    const expectedSignature = new Uint8Array(expectedSignatureBuffer);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const parsedPayload: unknown = JSON.parse(base64UrlToString(body));
    return isValidPayload(parsedPayload, now) ? parsedPayload : null;
  } catch {
    return null;
  }
}
