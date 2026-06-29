import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { message: 'Không được phép. Vui lòng đăng nhập lại.' } },
        { status: 401 }
      );
    }
    if (admin.role === 'SALE') {
      return NextResponse.json(
        { error: { message: 'Tài khoản sale không có quyền truy cập audit log.' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { action: { contains: query, mode: 'insensitive' } },
        { actor: { contains: query, mode: 'insensitive' } },
        { target: { contains: query, mode: 'insensitive' } },
        { details: { contains: query, mode: 'insensitive' } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100, // Giới hạn tối đa 100 log gần nhất để đảm bảo hiệu năng
    });

    return NextResponse.json({ data: logs });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tải nhật ký hoạt động.' } },
      { status: 500 }
    );
  }
}
