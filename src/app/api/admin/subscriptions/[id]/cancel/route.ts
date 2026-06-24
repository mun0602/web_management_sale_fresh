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
    const { reason } = body;

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

    const updatedSub = await prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { user: { select: { email: true } }, plan: true }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CANCEL_SUBSCRIPTION',
        actor: admin.email,
        target: `Subscription #${id}`,
        details: `Hủy thuê bao của ${existingSub.user.email} (${existingSub.plan.name}). Lý do: ${reason || 'Không cung cấp'}`,
      },
    });

    return NextResponse.json({ data: updatedSub });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi hủy thuê bao.' } },
      { status: 500 }
    );
  }
}
