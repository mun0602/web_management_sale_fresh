import redis from '@/lib/redis';

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
  exp: number;
  iat: number;
}

/**
 * Ký JWT cho bàn phím với thời hạn 24 giờ
 */
export async function signKeyboardToken(
  payload: { sub: string; role: string; sid: string },
  ttlSeconds = 24 * 60 * 60 // 24 giờ
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

/**
 * Xác thực token bàn phím và kiểm tra sid trên Redis
 */
export async function verifyKeyboardToken(token: string): Promise<KeyboardSessionPayload | null> {
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

    const payload: KeyboardSessionPayload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null; // Token hết hạn
    }

    // Bỏ qua kiểm tra trùng lặp session (Active Session) để tránh đá phiên của bàn phím khi đăng nhập web
    /*
    if (payload.sid) {
      const activeSession = await redis.get(`session:${payload.sub}`);
      if (activeSession && activeSession !== payload.sid) {
        console.warn(`Session conflict for user ${payload.sub}: active=${activeSession}, token=${payload.sid}`);
        return null; // Trùng lặp/phiên khác đã chiếm dụng
      }
    }
    */

    return payload;
  } catch (err) {
    console.error('Error verifying keyboard token:', err);
    return null;
  }
}
