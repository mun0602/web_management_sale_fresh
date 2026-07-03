import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

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
    const body = await request.json();
    const { role, name, phone, password } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy tài khoản người dùng.' } },
        { status: 404 }
      );
    }

    if (admin.role === 'SALE' && existingUser.createdBySaleId !== admin.id) {
      return NextResponse.json(
        { error: { message: 'Tài khoản sale không có quyền chỉnh sửa người dùng này.' } },
        { status: 403 }
      );
    } else if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'SALE') {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền chỉnh sửa tài khoản người dùng.' } },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    if (role !== undefined) {
      const sanitizedRole = role.toUpperCase();
      const allowedRoles = ['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY', 'SALE', 'USER'];
      if (!allowedRoles.includes(sanitizedRole)) {
        return NextResponse.json(
          { error: { message: 'Quyền (Role) không hợp lệ.' } },
          { status: 400 }
        );
      }

      // Chỉ SUPER_ADMIN mới được thay đổi quyền (Role)
      if (admin.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: { message: 'Chỉ có Super Admin mới được thay đổi quyền hạn tài khoản.' } },
          { status: 403 }
        );
      }
      updateData.role = sanitizedRole;
    }

    if (password !== undefined && password !== '') {
      // Cho phép SUPER_ADMIN đổi mật khẩu bất kỳ ai, hoặc SALE đổi mật khẩu của user do chính họ tạo
      if (admin.role !== 'SUPER_ADMIN' && (admin.role !== 'SALE' || existingUser.createdBySaleId !== admin.id)) {
        return NextResponse.json(
          { error: { message: 'Bạn không có quyền thay đổi mật khẩu của tài khoản này.' } },
          { status: 403 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.plainPassword = password;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...sanitizedUpdatedUser } = updatedUser;

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER',
        actor: admin.email,
        target: `User #${id}`,
        details: `Cập nhật thông tin tài khoản ${existingUser.email} -> thay đổi: ${JSON.stringify(
          Object.keys(updateData).filter((k) => k !== 'password')
        )}`,
      },
    });

    return NextResponse.json({ data: sanitizedUpdatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi cập nhật tài khoản.' } },
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

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy người dùng cần xóa.' } },
        { status: 404 }
      );
    }

    if (admin.role !== 'SUPER_ADMIN' && (admin.role !== 'SALE' || existingUser.createdBySaleId !== admin.id)) {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền xóa người dùng này.' } },
        { status: 403 }
      );
    }

    if (existingUser.id === admin.id) {
      return NextResponse.json(
        { error: { message: 'Bạn không thể tự xóa tài khoản của chính mình.' } },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    // Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        actor: admin.email,
        target: `User #${id}`,
        details: `Xóa tài khoản: ${existingUser.email}`,
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi xóa người dùng.' } },
      { status: 500 }
    );
  }
}
