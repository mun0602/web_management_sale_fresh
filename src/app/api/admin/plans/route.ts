import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: { message: 'Không được phép. Vui lòng đăng nhập lại.' } },
        { status: 401 }
      );
    }

    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: plans });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tải danh sách gói cước.' } },
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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, price, appleId, googleId, features } = body;

    if (!name || typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: { message: 'Thông tin gói cước không hợp lệ.' } },
        { status: 400 }
      );
    }

    // Xử lý features sang string cách nhau bằng dấu phẩy
    let featuresStr = '';
    if (Array.isArray(features)) {
      featuresStr = features.join(',');
    } else if (typeof features === 'string') {
      featuresStr = features;
    }

    const newPlan = await prisma.plan.create({
      data: {
        name,
        price,
        appleId: appleId || null,
        googleId: googleId || null,
        features: featuresStr,
      },
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PLAN',
        actor: admin.email,
        target: `Plan #${newPlan.id}`,
        details: `Tạo gói cước mới "${name}" với giá ${price.toLocaleString('vi-VN')} VNĐ`,
      },
    });

    return NextResponse.json({ data: newPlan });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tạo gói cước.' } },
      { status: 500 }
    );
  }
}
