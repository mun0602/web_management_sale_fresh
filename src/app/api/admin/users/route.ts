import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionAdmin } from '@/lib/auth/session';
import bcrypt from 'bcryptjs';
import redis from '@/lib/redis';

/** Tính AI limit của user từ subscription + plan features */
async function calcAILimit(userId: string): Promise<{ limit: number; isUnlimited: boolean }> {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: 'active', endDate: { gt: new Date() } },
    include: { plan: true }
  });
  let base = 5, addon = 0, unlimited = false;
  for (const s of subs) {
    const f = s.plan.features || '';
    if (f.includes('ai_unlimited')) { unlimited = true; break; }
    for (let p of f.split(',')) {
      p = p.trim();
      if (p.startsWith('ai_limit:')) { const v = parseInt(p.slice(9)); if (!isNaN(v) && v > base) base = v; }
      if (p.startsWith('ai_addon:')) { const v = parseInt(p.slice(9)); if (!isNaN(v)) addon += v; }
    }
  }
  return unlimited ? { limit: -1, isUnlimited: true } : { limit: base + addon, isUnlimited: false };
}

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

    // Format dữ liệu + AI quota từ Redis cho mỗi user
    const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const sanitizedUsers = await Promise.all(users.map(async (u) => {
      const { password, ...sanitized } = u;
      const { limit, isUnlimited } = await calcAILimit(u.id);
      let aiUsage = 0;
      if (!isUnlimited) {
        const raw = await redis.get(`user:ai_quota:${u.id}:${vnDate}`);
        aiUsage = raw ? parseInt(raw, 10) : 0;
      }
      return {
        ...sanitized,
        aiQuota: { limit, usage: aiUsage, isUnlimited }
      };
    }));

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

    // Phân quyền tạo tài khoản:
    // - SUPER_ADMIN: tạo mọi role
    // - SUPPORT: chỉ tạo USER bàn phím
    // - Các role khác: không được phép
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(admin.role)) {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền tạo tài khoản mới.' } },
        { status: 403 }
      );
    }

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

    // SUPPORT chỉ được tạo USER bàn phím, không được tạo admin
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

