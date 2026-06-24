import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 60 * 60;

export type AdminRole = 'SUPER_ADMIN' | 'FINANCE' | 'SUPPORT' | 'READ_ONLY';

export interface SessionPayload {
  sub: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

const encodedHeader = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
}

function createSignature(input: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(input).digest();
}

function isAdminRole(value: unknown): value is AdminRole {
  return ['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY'].includes(
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

export function signToken(
  payload: Pick<SessionPayload, 'sub' | 'role'>,
  now = Math.floor(Date.now() / 1000),
): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 bytes');
  }

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const input = `${encodedHeader}.${body}`;
  const signature = createSignature(input, secret).toString('base64url');

  return `${input}.${signature}`;
}

export function verifyToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
): SessionPayload | null {
  const secret = getSessionSecret();
  if (!secret || token.length > 4096) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    if (header !== encodedHeader) return null;

    const suppliedSignature = Buffer.from(signature, 'base64url');
    const expectedSignature = createSignature(`${header}.${body}`, secret);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const parsedPayload: unknown = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );
    return isValidPayload(parsedPayload, now) ? parsedPayload : null;
  } catch {
    return null;
  }
}
