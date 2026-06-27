import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'phimtat01@gmail.com';
    const password = searchParams.get('password') || 'Chinhniem@0602';

    // Tìm kiếm user cũ
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Đặt lại mật khẩu
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          password: passwordHash,
          status: 'active' // Đảm bảo tài khoản không bị khóa
        }
      });

      // Kiểm tra xem có subscription hoạt động không, nếu chưa thì tạo mới
      const activeSub = await prisma.subscription.findFirst({
        where: { userId: updatedUser.id, status: 'active' }
      });

      if (!activeSub) {
        await prisma.subscription.create({
          data: {
            userId: updatedUser.id,
            planId: 'plan-1-year', // Premium 1 năm
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Tài khoản ${email} đã tồn tại. Mật khẩu đã được cập nhật thành: ${password}. Đã kích hoạt gói Premium.` 
      });
    }

    // Tạo user mới
    const newUser = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: 'USER',
        name: 'Phím Tắt Admin',
        phone: '0900000000',
        status: 'active'
      }
    });

    // Tạo gói cước Premium 1 năm
    await prisma.subscription.create({
      data: {
        userId: newUser.id,
        planId: 'plan-1-year',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Đã tạo mới thành công tài khoản: ${email} | Mật khẩu: ${password} | Gói cước: Premium 1 năm.` 
    });
  } catch (error: any) {
    console.error('Debug DB Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
