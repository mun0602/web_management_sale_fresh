import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function PATCH(
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

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy giao dịch thanh toán.' } },
        { status: 404 }
      );
    }

    if (status !== undefined) {
      if (!['succeeded', 'refunded', 'failed'].includes(status)) {
        return NextResponse.json(
          { error: { message: 'Trạng thái giao dịch không hợp lệ.' } },
          { status: 400 }
        );
      }
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: { status },
      include: { user: { select: { email: true } } }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_PAYMENT',
        actor: admin.email,
        target: `Payment #${id}`,
        details: `Cập nhật trạng thái giao dịch ${existingPayment.transactionId} của ${existingPayment.user.email}: ${existingPayment.status} -> ${status}`,
      },
    });

    return NextResponse.json({ data: updatedPayment });
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cập nhật giao dịch.' } },
      { status: 500 }
    );
  }
}
