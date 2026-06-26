import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth/token';

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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Nguồn yêu cầu không hợp lệ' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete('admin_token');
  cookieStore.delete('admin_role');

  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
