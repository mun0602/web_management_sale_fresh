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
    const { status } = body; // e.g. "locked", "active"

    if (!status || !['active', 'locked'].includes(status)) {
      return NextResponse.json(
        { error: { message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: active, locked.' } },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy người dùng.' } },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái người dùng trong DB
    await prisma.user.update({
      where: { id },
      data: { status },
    });

    // Ghi Audit Log hành động thay đổi trạng thái
    await prisma.auditLog.create({
      data: {
        action: status === 'locked' ? 'LOCK_USER' : 'UNLOCK_USER',
        actor: admin.email,
        target: `User #${id}`,
        details: `${status === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản của ${existingUser.email}`,
      },
    });

    return NextResponse.json({ data: { success: true, status } });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cập nhật trạng thái người dùng.' } },
      { status: 500 }
    );
  }
}
