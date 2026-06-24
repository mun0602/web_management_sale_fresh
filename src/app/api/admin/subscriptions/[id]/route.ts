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

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'SUPPORT') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, endDate } = body;

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

    const updateData: any = {};
    if (status !== undefined) {
      if (!['active', 'expired', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { error: { message: 'Trạng thái thuê bao không hợp lệ.' } },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (endDate !== undefined) {
      updateData.endDate = new Date(endDate);
    }

    const updatedSub = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: { user: { select: { email: true } }, plan: true }
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SUBSCRIPTION',
        actor: admin.email,
        target: `Subscription #${id}`,
        details: `Cập nhật trạng thái thuê bao của ${existingSub.user.email} (${existingSub.plan.name}) -> ${JSON.stringify(updateData)}`,
      },
    });

    return NextResponse.json({ data: updatedSub });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cập nhật thuê bao.' } },
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

    const existingSub = await prisma.subscription.findUnique({
      where: { id },
      include: { user: true, plan: true }
    });

    if (!existingSub) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy thuê bao cần xóa.' } },
        { status: 404 }
      );
    }

    await prisma.subscription.delete({
      where: { id },
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SUBSCRIPTION',
        actor: admin.email,
        target: `Subscription #${id}`,
        details: `Xóa thuê bao của ${existingSub.user.email} (${existingSub.plan.name})`,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi xóa thuê bao.' } },
      { status: 500 }
    );
  }
}
