import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const length = secret.length;
  const isAtLeast32 = length >= 32;
  return NextResponse.json({
    hasSecret: !!secret,
    length,
    isAtLeast32,
    secretStartsWith: secret.slice(0, 5),
    secretEndsWith: secret.slice(-5),
    nodeEnv: process.env.NODE_ENV
  });
}
