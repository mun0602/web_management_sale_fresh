import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';

    const whereClause: any = {};

    if (query) {
      whereClause.user = {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      };
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          }
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: subscriptions });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tải danh sách thuê bao.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { message: 'Không được phép. Vui lòng đăng nhập lại.' } },
        { status: 401 }
      );
    }

    // Chỉ có SUPER_ADMIN, SUPPORT mới được thay đổi cấu hình thuê bao khách hàng
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'SUPPORT') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, planId, durationDays } = body;

    if (!email || !planId || typeof durationDays !== 'number' || durationDays <= 0) {
      return NextResponse.json(
        { error: { message: 'Thông tin thuê bao không hợp lệ.' } },
        { status: 400 }
      );
    }

    // Kiểm tra người dùng
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy người dùng với email đã nhập.' } },
        { status: 404 }
      );
    }

    // Kiểm tra gói cước
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy gói cước được chọn.' } },
        { status: 404 }
      );
    }

    // Tạo thuê bao
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationDays);

    const newSub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startDate,
        endDate,
      },
      include: {
        user: {
          select: { email: true, name: true }
        },
        plan: true
      }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_SUBSCRIPTION',
        actor: admin.email,
        target: `Subscription #${newSub.id}`,
        details: `Cấp thủ công gói cước "${plan.name}" cho người dùng ${email} trong ${durationDays} ngày.`,
      },
    });

    return NextResponse.json({ data: newSub });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cấp thuê bao.' } },
      { status: 500 }
    );
  }
}
