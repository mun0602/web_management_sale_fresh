import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { message: 'Không được phép. Vui lòng đăng nhập lại.' } },
        { status: 401 }
      );
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'SUPPORT') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { durationDays } = body;

    if (typeof durationDays !== 'number' || durationDays === 0) {
      return NextResponse.json(
        { error: { message: 'Số ngày điều chỉnh không hợp lệ.' } },
        { status: 400 }
      );
    }

    const existingSub = await prisma.subscription.findUnique({
      where: { id },
      include: { user: true, plan: true }
    });

    if (!existingSub) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy thuê bao.' } },
        { status: 404 }
      );
    }

    // Tính toán ngày kết thúc mới
    const currentEndDate = new Date(existingSub.endDate);
    const now = new Date();
    // Nếu thuê bao đã hết hạn, tính từ hôm nay. Ngược lại, tính từ ngày hết hạn cũ.
    const baseDate = currentEndDate < now ? now : currentEndDate;
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(baseDate.getDate() + durationDays);

    const updatedSub = await prisma.subscription.update({
      where: { id },
      data: {
        endDate: newEndDate,
        status: 'active' // Đảm bảo trạng thái chuyển thành active nếu gia hạn
      },
      include: { user: { select: { email: true } }, plan: true }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'ADJUST_SUBSCRIPTION',
        actor: admin.email,
        target: `Subscription #${id}`,
        details: `Gia hạn thuê bao của ${existingSub.user.email} (${existingSub.plan.name}) thêm ${durationDays} ngày. Hạn mới: ${newEndDate.toISOString()}`,
      },
    });

    return NextResponse.json({ data: updatedSub });
  } catch (error: any) {
    console.error('Error adjusting subscription:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi điều chỉnh thời hạn thuê bao.' } },
      { status: 500 }
    );
  }
}
