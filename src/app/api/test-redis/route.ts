import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET() {
  try {
    // Test Redis Connection
    const pingRes = await redis.ping();
    await redis.set('test_connection', 'ok_from_nextjs', 'EX', 60);
    const getRes = await redis.get('test_connection');

    return NextResponse.json({
      success: true,
      message: 'Redis connection test passed!',
      redisPing: pingRes,
      redisGetVal: getRes,
      envSecret: process.env.ADMIN_SESSION_SECRET || 'fallback_default_key',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Redis connection test failed!',
      error: error.message,
      stack: error.stack,
      envSecret: process.env.ADMIN_SESSION_SECRET || 'fallback_default_key',
      redisUrlEnv: process.env.REDIS_URL ? 'configured' : 'not_configured',
    }, { status: 500 });
  }
}
