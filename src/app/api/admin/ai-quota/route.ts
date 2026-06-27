import { NextResponse } from 'next/server';
import { getAuthorizedAdmin } from '@/lib/auth/admin-auth';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await getAuthorizedAdmin(request);
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const configLimit = await redis.get('global:ai_quota:free_limit');
    return NextResponse.json({
      success: true,
      defaultLimit: configLimit ? parseInt(configLimit, 10) : 100
    });
  } catch (err: any) {
    console.error('Lỗi khi lấy cấu hình AI quota:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin(request);
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const { defaultLimit } = await request.json();
    if (typeof defaultLimit !== 'number' || defaultLimit < 0) {
      return NextResponse.json({ success: false, message: 'Giới hạn không hợp lệ' }, { status: 400 });
    }

    await redis.set('global:ai_quota:free_limit', defaultLimit.toString());
    
    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình thành công',
      defaultLimit
    });
  } catch (err: any) {
    console.error('Lỗi khi lưu cấu hình AI quota:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
