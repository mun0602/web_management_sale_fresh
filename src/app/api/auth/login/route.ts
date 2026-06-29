import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  AdminRole,
  SESSION_TTL_SECONDS,
  signToken,
} from '@/lib/auth/token';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isRateLimited, getRateLimitResetSeconds } from '@/lib/rate-limit';

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
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host') || requestUrl.host;
    const requestHostname = forwardedHost.split(':')[0];
    return originUrl.hostname === requestHostname || originUrl.hostname === requestUrl.hostname;
  } catch {
    return false;
  }
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
  if (process.env.ENABLE_DEMO_AUTH !== 'true') {
    return null;
  }

  const { DEMO_ADMIN_ID, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } = process.env;
  const role = process.env.DEMO_ADMIN_ROLE;
  if (
    !DEMO_ADMIN_ID ||
    !DEMO_ADMIN_EMAIL ||
    !DEMO_ADMIN_PASSWORD ||
    !['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY', 'SALE'].includes(role ?? '')
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

  // L-03: Rate limiting - 10 lần thử / 15 phút / IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (isRateLimited(`login:${clientIp}`)) {
    const retryAfter = getRateLimitResetSeconds(`login:${clientIp}`);
    return json({ error: `Quá nhiều lần thử. Vui lòng đợi ${retryAfter} giây.` }, 429);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_LOGIN_BODY_BYTES) {
    return json({ error: 'Yêu cầu quá lớn' }, 413);
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

    // 1. Kiểm tra tài khoản trong database thật trước
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { email }
      });
    } catch (dbError) {
      console.error('Database connection failed during login, trying fallback:', dbError);
    }

    let tokenPayload: { sub: string; role: AdminRole } | null = null;

    // Cho phép tất cả role đăng nhập (bao gồm USER bàn phím, SUPER_ADMIN, FINANCE, SUPPORT, READ_ONLY)
    const ALLOWED_ROLES = ['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY', 'SALE', 'USER'];
    if (user && ALLOWED_ROLES.includes(user.role)) {
      if (user.status === 'locked') {
        return json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' }, 403);
      }
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (passwordMatches) {
        tokenPayload = { sub: user.id, role: user.role as AdminRole };
      }
    }

    // 2. Nếu không tìm thấy user hoặc password không khớp, thử dùng Demo Credentials env fallback
    if (!tokenPayload) {
      const credentials = getDemoCredentials();
      if (credentials) {
        const emailMatches = safeTextEqual(email, credentials.email);
        const passwordMatches = safeTextEqual(password, credentials.password);
        if (emailMatches && passwordMatches) {
          tokenPayload = { sub: credentials.id, role: credentials.role };
        }
      }
    }

    if (!tokenPayload) {
      return json({ error: 'Email hoặc mật khẩu quản trị không đúng' }, 401);
    }

    let token: string;
    try {
      token = await signToken(tokenPayload);
    } catch {
      return json({ error: 'Session server chưa được cấu hình an toàn' }, 503);
    }

    const isHttps = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
      priority: 'high',
    });

    return json({ success: true }, 200);
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  }
}
