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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Chỉ Super Admin mới được xem doanh thu theo sale.' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const query = (searchParams.get('q') || '').trim();

    const fromDate = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : undefined;
    const toDate = toStr ? new Date(`${toStr}T23:59:59.999Z`) : undefined;
    const dateFilter = fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {};

    const sales = await prisma.user.findMany({
      where: {
        role: 'SALE',
        ...(query ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' as const } },
            { name: { contains: query, mode: 'insensitive' as const } },
            { phone: { contains: query, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
      include: {
        createdUsers: {
          include: {
            payments: {
              where: dateFilter,
            },
            subscriptions: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = sales.map((sale) => {
      let grossRevenue = 0;
      let refund = 0;
      let paymentCount = 0;
      let activeSubscriptions = 0;

      for (const user of sale.createdUsers) {
        for (const payment of user.payments) {
          if (payment.status === 'succeeded') {
            grossRevenue += payment.amount;
            paymentCount += 1;
          } else if (payment.status === 'refunded') {
            refund += payment.amount;
          }
        }
        activeSubscriptions += user.subscriptions.length;
      }

      const { password: _password, createdUsers: _createdUsers, ...safeSale } = sale;
      return {
        sale: safeSale,
        userCount: sale.createdUsers.length,
        activeSubscriptions,
        paymentCount,
        grossRevenue,
        refund,
        netRevenue: grossRevenue - refund,
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching sale revenue:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tải doanh thu theo sale.' } },
      { status: 500 }
    );
  }
}
