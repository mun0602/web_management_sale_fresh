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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, price, appleId, googleId, features } = body;

    const existingPlan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy gói cước cần sửa.' } },
        { status: 404 }
      );
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return NextResponse.json(
          { error: { message: 'Giá gói cước không hợp lệ.' } },
          { status: 400 }
        );
      }
      updateData.price = price;
    }
    if (appleId !== undefined) updateData.appleId = appleId || null;
    if (googleId !== undefined) updateData.googleId = googleId || null;
    
    if (features !== undefined) {
      let featuresStr = '';
      if (Array.isArray(features)) {
        featuresStr = features.join(',');
      } else if (typeof features === 'string') {
        featuresStr = features;
      }
      updateData.features = featuresStr;
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_PLAN',
        actor: admin.email,
        target: `Plan #${id}`,
        details: `Cập nhật gói cước "${existingPlan.name}" -> thay đổi: ${JSON.stringify(updateData)}`,
      },
    });

    return NextResponse.json({ data: updatedPlan });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cập nhật gói cước.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const existingPlan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy gói cước cần xóa.' } },
        { status: 404 }
      );
    }

    // Xóa gói cước
    await prisma.plan.delete({
      where: { id },
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_PLAN',
        actor: admin.email,
        target: `Plan #${id}`,
        details: `Xóa gói cước "${existingPlan.name}"`,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    // Nếu có ràng buộc khóa ngoại (ví dụ có Subscription trỏ tới Plan)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: { message: 'Không thể xóa gói cước này vì đã có thuê bao đăng ký sử dụng.' } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi xóa gói cước.' } },
      { status: 500 }
    );
  }
}
