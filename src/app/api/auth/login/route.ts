import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  AdminRole,
  SESSION_TTL_SECONDS,
  signToken,
} from '@/lib/auth/token';

const MAX_LOGIN_BODY_BYTES = 4096;

function json(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function safeTextEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function getDemoCredentials(): {
  id: string;
  email: string;
  password: string;
  role: AdminRole;
} | null {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_DEMO_AUTH !== 'true'
  ) {
    return null;
  }

  const { DEMO_ADMIN_ID, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } = process.env;
  const role = process.env.DEMO_ADMIN_ROLE;
  if (
    !DEMO_ADMIN_ID ||
    !DEMO_ADMIN_EMAIL ||
    !DEMO_ADMIN_PASSWORD ||
    !['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY'].includes(role ?? '')
  ) {
    return null;
  }

  return {
    id: DEMO_ADMIN_ID,
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    role: role as AdminRole,
  };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return json({ error: 'Nguồn yêu cầu không hợp lệ' }, 403);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_LOGIN_BODY_BYTES) {
    return json({ error: 'Yêu cầu quá lớn' }, 413);
  }

  const credentials = getDemoCredentials();
  if (!credentials) {
    return json(
      { error: 'Demo auth chưa được cấu hình hoặc bị tắt trong production' },
      503,
    );
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_LOGIN_BODY_BYTES) {
      return json({ error: 'Yêu cầu quá lớn' }, 413);
    }

    const input: unknown = JSON.parse(rawBody);
    if (!input || typeof input !== 'object') {
      return json({ error: 'Yêu cầu không hợp lệ' }, 400);
    }

    const { email, password } = input as Record<string, unknown>;
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 254 ||
      password.length > 256
    ) {
      return json({ error: 'Yêu cầu không hợp lệ' }, 400);
    }

    const emailMatches = safeTextEqual(email, credentials.email);
    const passwordMatches = safeTextEqual(password, credentials.password);
    if (!emailMatches || !passwordMatches) {
      return json({ error: 'Email hoặc mật khẩu quản trị không đúng' }, 401);
    }

    let token: string;
    try {
      token = signToken({ sub: credentials.id, role: credentials.role });
    } catch {
      return json({ error: 'Session server chưa được cấu hình an toàn' }, 503);
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
      priority: 'high',
    });

    return json({ success: true }, 200);
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  }
}
