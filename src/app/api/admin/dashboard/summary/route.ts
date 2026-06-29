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

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const fromDate = fromStr ? new Date(fromStr) : undefined;
    const toDate = toStr ? new Date(toStr) : undefined;

    // Bộ lọc ngày cho Payment (createdAt)
    const dateFilter = fromDate || toDate ? {
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      }
    } : {};

    // Bộ lọc ngày cho Subscription (khoảng thời gian chồng lấn)
    const subDateFilter = fromDate || toDate ? {
      startDate: {
        ...(toDate ? { lte: toDate } : {})
      },
      endDate: {
        ...(fromDate ? { gte: fromDate } : {})
      }
    } : {};

    // Bộ lọc ngày cho User (createdAt)
    const userDateFilter = fromDate || toDate ? {
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {})
      }
    } : {};

    const saleUserFilter = admin.role === 'SALE' ? { createdBySaleId: admin.id } : {};
    const salePaymentFilter = admin.role === 'SALE' ? { user: { createdBySaleId: admin.id } } : {};
    const saleSubscriptionFilter = admin.role === 'SALE' ? { user: { createdBySaleId: admin.id } } : {};

    // 1. Tính toán doanh thu từ bảng Payment thật (dùng aggregate thay vì findMany)
    const grossRevenueResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { 
        status: 'succeeded',
        ...salePaymentFilter,
        ...dateFilter
      },
    });
    const refundResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { 
        status: 'refunded',
        ...salePaymentFilter,
        ...dateFilter
      },
    });
    const grossRevenue = grossRevenueResult._sum.amount || 0;
    const refund = refundResult._sum.amount || 0;
    const netRevenue = grossRevenue - refund;

    // 2. Đếm số lượng thuê bao hoạt động và người dùng hoạt động trong khoảng thời gian lọc
    const activeSubsCount = await prisma.subscription.count({
      where: { 
        status: 'active',
        ...saleSubscriptionFilter,
        ...subDateFilter
      }
    });

    const activeUsersCount = await prisma.user.count({
      where: {
        ...saleUserFilter,
        subscriptions: {
          some: { 
            status: 'active',
            ...subDateFilter
          }
        }
      }
    });

    // 3. Đếm số người dùng thử (trial) đăng ký trong thời gian này và chưa thực hiện giao dịch nào
    const trialUsersCount = await prisma.user.count({
      where: {
        role: 'USER',
        ...saleUserFilter,
        ...userDateFilter,
        payments: {
          none: {}
        }
      }
    });

    // 4. Tính toán MRR thực tế từ các thuê bao đang hoạt động
    const activeSubs = await prisma.subscription.findMany({
      where: { 
        status: 'active',
        ...saleSubscriptionFilter,
        ...subDateFilter
      },
      include: { plan: true }
    });

    const mrr = activeSubs.reduce((sum, sub) => {
      const durationDays = Math.ceil((sub.endDate.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24));
      // Chia nhỏ giá gói cước theo số tháng sử dụng (ví dụ: năm chia 12, tháng chia 1)
      const months = durationDays >= 360 ? 12 : (durationDays >= 28 ? Math.round(durationDays / 30) : 1);
      const monthlyPrice = sub.plan.price / (months || 1);
      return sum + Math.round(monthlyPrice);
    }, 0);

    // ARPU = MRR / Active Users
    const arpu = activeUsersCount > 0 ? Math.round(mrr / activeUsersCount) : 0;

    return NextResponse.json({
      data: {
        netRevenue,
        grossRevenue,
        mrr,
        refund,
        activeUsers: activeUsersCount,
        trialUsers: trialUsersCount,
        activeSubscriptions: activeSubsCount,
        arpu
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: { message: 'Lỗi máy chủ khi tải dữ liệu tổng quan.' } }, { status: 500 });
  }
}
