import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyToken } from '@/lib/auth/token';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return NextResponse.json(
      { error: 'Chưa xác thực' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { user: { id: session.sub, role: session.role } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
