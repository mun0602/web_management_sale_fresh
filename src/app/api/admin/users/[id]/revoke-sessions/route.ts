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

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'SUPPORT') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền thực hiện hành động này.' } },
        { status: 403 }
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

    // Thu hồi thật: set sessionRevokedAt → mọi token có iat < timestamp này sẽ bị từ chối
    const revokedAt = new Date();
    await prisma.user.update({
      where: { id },
      data: { sessionRevokedAt: revokedAt },
    });

    // Ghi Audit Log hành động thu hồi phiên đăng nhập
    await prisma.auditLog.create({
      data: {
        action: 'REVOKE_SESSIONS',
        actor: admin.email,
        target: `User #${id}`,
        details: `Thu hồi tất cả phiên đăng nhập của tài khoản ${existingUser.email}`,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error revoking user sessions:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi thu hồi phiên đăng nhập.' } },
      { status: 500 }
    );
  }
}
