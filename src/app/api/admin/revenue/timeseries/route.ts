import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from') || '2026-05-25';
    const toStr = searchParams.get('to') || '2026-06-25';

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);

    // 1. Lấy tất cả các giao dịch thanh toán thành công trong khoảng thời gian chỉ định
    const payments = await prisma.payment.findMany({
      where: {
        status: 'succeeded',
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 2. Gom nhóm dữ liệu theo ngày
    const groups: { [key: string]: number } = {};

    // Khởi tạo các điểm mốc thời gian trên biểu đồ (bước nhảy 3 ngày để tương thích với Recharts)
    let current = new Date(fromDate);
    while (current <= toDate) {
      const label = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
      groups[label] = 0;
      current.setDate(current.getDate() + 3);
    }

    // Gán doanh thu thực tế vào các điểm mốc gần nhất
    payments.forEach(p => {
      const date = new Date(p.createdAt);
      let closestLabel = '';
      let minDiff = Infinity;
      
      Object.keys(groups).forEach(label => {
        const [d, m] = label.split('/').map(Number);
        const labelDate = new Date(date.getFullYear(), m - 1, d);
        const diff = Math.abs(date.getTime() - labelDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestLabel = label;
        }
      });

      if (closestLabel) {
        groups[closestLabel] += p.amount;
      }
    });

    const timeseriesData = Object.keys(groups).map(name => ({
      name,
      revenue: groups[name]
    }));

    return NextResponse.json({
      data: timeseriesData
    });
  } catch (error: any) {
    console.error('Error fetching revenue timeseries:', error);
    return NextResponse.json({ error: { message: 'Lỗi máy chủ khi tải biểu đồ doanh thu.' } }, { status: 500 });
  }
}
