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
      whereClause.OR = [
        { transactionId: { contains: query, mode: 'insensitive' } },
        { productName: { contains: query, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: payments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tải danh sách giao dịch.' } },
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

    // Chỉ có SUPER_ADMIN hoặc FINANCE mới được thao tác thanh toán/hoàn tiền
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, amount, productName, platform, transactionId } = body;

    if (!email || typeof amount !== 'number' || amount <= 0 || !productName || !platform || !transactionId) {
      return NextResponse.json(
        { error: { message: 'Thông tin giao dịch không hợp lệ.' } },
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

    // Kiểm tra trùng mã giao dịch
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionId },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: { message: 'Mã giao dịch này đã tồn tại trên hệ thống.' } },
        { status: 400 }
      );
    }

    const newPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        productName,
        platform,
        transactionId,
        status: 'succeeded',
      },
      include: {
        user: { select: { email: true } }
      }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PAYMENT',
        actor: admin.email,
        target: `Payment #${newPayment.id}`,
        details: `Tạo thủ công giao dịch ${transactionId} trị giá ${amount.toLocaleString('vi-VN')} VNĐ cho ${email}.`,
      },
    });

    return NextResponse.json({ data: newPayment });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tạo giao dịch.' } },
      { status: 500 }
    );
  }
}
