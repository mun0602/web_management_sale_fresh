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

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

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

    if (existingPayment.status === 'refunded') {
      return NextResponse.json(
        { error: { message: 'Giao dịch này đã được hoàn tiền trước đó.' } },
        { status: 400 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: { status: 'refunded' },
      include: { user: { select: { email: true } } }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'REFUND_PAYMENT',
        actor: admin.email,
        target: `Payment #${id}`,
        details: `Hoàn tiền giao dịch ${existingPayment.transactionId} của ${existingPayment.user.email}. Số tiền: ${existingPayment.amount.toLocaleString('vi-VN')} ₫. Lý do: ${reason || 'Không cung cấp'}`,
      },
    });

    return NextResponse.json({ data: updatedPayment });
  } catch (error: any) {
    console.error('Error refunding payment:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi hoàn tiền giao dịch.' } },
      { status: 500 }
    );
  }
}
