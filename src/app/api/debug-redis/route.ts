import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const secret = process.env.ADMIN_SESSION_SECRET || 'FALLBACK_KEY_NOT_FOUND';

    const keys = await redis.keys('session:*');
    const sessions: Record<string, string | null> = {};

    for (const key of keys) {
      sessions[key] = await redis.get(key);
    }

    let targetSessionValue = null;
    if (userId) {
      targetSessionValue = await redis.get(`session:${userId}`);
    }

    return NextResponse.json({
      success: true,
      envSecret: secret,
      redisKeysCount: keys.length,
      sessions: sessions,
      targetUser: userId,
      targetValue: targetSessionValue
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
