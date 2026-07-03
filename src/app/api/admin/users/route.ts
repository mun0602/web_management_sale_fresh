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

function calcManualPaymentAmount(plan: { price: number; features: string }, durationDays: number) {
  const features = plan.features || '';
  if (features.split(',').map(f => f.trim()).includes('fixed_price')) {
    return plan.price;
  }
  return Math.round((plan.price * durationDays) / 30);
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
    if (query) {
      whereClause.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (admin.role === 'SALE') {
      whereClause.role = 'USER';
      whereClause.createdBySaleId = admin.id;
    } else if (role !== 'all') {
      whereClause.role = role.toUpperCase();
    }

    const total = await prisma.user.count({ where: whereClause });

    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
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
      data: sanitizedUsers,
      meta: {
        page,
        limit,
        total
      }
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

    // Chỉ cho phép tạo USER bàn phím từ màn quản lý người dùng.
    if (!['SUPER_ADMIN', 'SUPPORT', 'SALE'].includes(admin.role)) {
      return NextResponse.json(
        { error: { message: 'Bạn không có quyền tạo tài khoản mới.' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, phone, planId, durationDays, accountRole } = body;
    const account = typeof email === 'string' ? email.trim() : '';
    const normalizedPlanId = typeof planId === 'string' ? planId.trim() : '';
    const normalizedDurationDays = Number(durationDays || 30);
    const normalizedAccountRole = typeof accountRole === 'string' ? accountRole.toUpperCase() : 'USER';

    if (!account || !password) {
      return NextResponse.json(
        { error: { message: 'Vui lòng nhập username/tài khoản và mật khẩu.' } },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: { message: 'Mật khẩu tối thiểu 6 ký tự.' } },
        { status: 400 }
      );
    }

    if (account.length > 254) {
      return NextResponse.json(
        { error: { message: 'Username/tài khoản quá dài.' } },
        { status: 400 }
      );
    }

    if (normalizedPlanId && (!Number.isInteger(normalizedDurationDays) || normalizedDurationDays <= 0)) {
      return NextResponse.json(
        { error: { message: 'Thời hạn gói cước không hợp lệ.' } },
        { status: 400 }
      );
    }

    if (!['USER', 'SALE'].includes(normalizedAccountRole)) {
      return NextResponse.json(
        { error: { message: 'Loại tài khoản không hợp lệ.' } },
        { status: 400 }
      );
    }

    if (normalizedAccountRole === 'SALE' && admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: { message: 'Chỉ Super Admin mới được tạo tài khoản sale.' } },
        { status: 403 }
      );
    }

    if (admin.role === 'SALE' && normalizedAccountRole === 'USER' && !normalizedPlanId) {
      return NextResponse.json(
        { error: { message: 'Tài khoản sale bắt buộc chọn gói khi tạo user.' } },
        { status: 400 }
      );
    }

    // Kiểm tra tài khoản trùng lặp. Field DB vẫn là email để tránh migration.
    const existingUser = await prisma.user.findUnique({
      where: { email: account }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { message: 'Tài khoản này đã tồn tại trên hệ thống.' } },
        { status: 400 }
      );
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    const plan = normalizedAccountRole === 'USER' && normalizedPlanId
      ? await prisma.plan.findUnique({ where: { id: normalizedPlanId } })
      : null;

    if (normalizedPlanId && !plan) {
      return NextResponse.json(
        { error: { message: 'Không tìm thấy gói cước được chọn.' } },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: account,
          password: passwordHash,
          plainPassword: password,
          role: normalizedAccountRole,
          name: name || null,
          phone: phone || null,
          createdBySaleId: normalizedAccountRole === 'USER' && admin.role === 'SALE' ? admin.id : null
        }
      });

      let subscription = null;
      let payment = null;

      if (plan) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + normalizedDurationDays);
        const manualAmount = calcManualPaymentAmount(plan, normalizedDurationDays);

        subscription = await tx.subscription.create({
          data: {
            userId: newUser.id,
            planId: plan.id,
            status: 'active',
            startDate,
            endDate,
          },
          include: { plan: true }
        });

        if (manualAmount > 0) {
          payment = await tx.payment.create({
            data: {
              userId: newUser.id,
              amount: manualAmount,
              productName: `${plan.name} (${normalizedDurationDays} ngày)`,
              platform: 'Manual',
              transactionId: `manual_user_${newUser.id}_${Date.now()}`,
              status: 'succeeded',
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE_USER',
          actor: admin.email,
          target: `User #${newUser.id}`,
          details: plan
            ? `Tạo USER ${account}, cấp gói "${plan.name}" ${normalizedDurationDays} ngày, ghi nhận doanh thu ${calcManualPaymentAmount(plan, normalizedDurationDays).toLocaleString('vi-VN')} VNĐ.`
            : `Tạo tài khoản ${normalizedAccountRole} mới: ${account}`,
        }
      });

      return { newUser, subscription, payment };
    });

    const { password: _, ...sanitizedNewUser } = result.newUser;

    return NextResponse.json({
      data: {
        ...sanitizedNewUser,
        subscription: result.subscription,
        payment: result.payment,
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: { message: 'Lỗi máy chủ khi tạo tài khoản.' } },
      { status: 500 }
    );
  }
}
