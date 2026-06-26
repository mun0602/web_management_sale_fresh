import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';

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
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') || 'all';

    const whereClause: any = {};
    
    if (query) {
      whereClause.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (role !== 'all') {
      whereClause.role = role.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format dữ liệu theo ApiResponse chuẩn
    const sanitizedUsers = users.map(u => {
      const { password, ...sanitized } = u;
      return sanitized;
    });

    return NextResponse.json({
      data: sanitizedUsers
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: { message: 'Lỗi máy chủ khi tải danh sách người dùng.' } }, { status: 500 });
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

    // Chỉ SUPER_ADMIN mới được tạo admin khác, SUPPORT có thể tạo USER thường
    const body = await request.json();
    const { email, password, role, name, phone } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: { message: 'Thông tin tài khoản không đầy đủ.' } },
        { status: 400 }
      );
    }

    const sanitizedRole = role.toUpperCase();
    const allowedRoles = ['SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'READ_ONLY', 'USER'];
    if (!allowedRoles.includes(sanitizedRole)) {
      return NextResponse.json(
        { error: { message: 'Quyền (Role) không hợp lệ.' } },
        { status: 400 }
      );
    }

    if (sanitizedRole !== 'USER' && admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Chỉ có Super Admin mới có quyền tạo tài khoản quản trị.' } },
        { status: 403 }
      );
    }

    // Kiểm tra email trùng lặp
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { message: 'Email này đã tồn tại trên hệ thống.' } },
        { status: 400 }
      );
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: sanitizedRole,
        name: name || null,
        phone: phone || null
      }
    });

    const { password: _, ...sanitizedNewUser } = newUser;

    // Ghi Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        actor: admin.email,
        target: `User #${newUser.id}`,
        details: `Tạo tài khoản ${sanitizedRole} mới: ${email}`,
      }
    });

    return NextResponse.json({ data: sanitizedNewUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tạo tài khoản.' } },
      { status: 500 }
    );
  }
}

