import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { getSessionAdmin } from '@/lib/auth/session';

type RouteContext = { params: Promise<{ id: string }> };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Tính AI limit cho user dựa trên subscription + plan features
 */
async function calcAILimit(userId: string): Promise<{ limit: number; isUnlimited: boolean }> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: 'active', endDate: { gt: new Date() } },
    include: { plan: true }
  });

  let baseLimit = 5;
  let addonLimit = 0;
  let isUnlimited = false;

  for (const sub of subscriptions) {
    const features = sub.plan.features || '';
    if (features.includes('ai_unlimited')) {
      isUnlimited = true;
      break;
    }
    const parts = features.split(',');
    for (let f of parts) {
      f = f.trim();
      if (f.startsWith('ai_limit:')) {
        const l = parseInt(f.substring('ai_limit:'.length), 10);
        if (!isNaN(l) && l > baseLimit) baseLimit = l;
      }
      if (f.startsWith('ai_addon:')) {
        const a = parseInt(f.substring('ai_addon:'.length), 10);
        if (!isNaN(a)) addonLimit += a;
      }
    }
  }

  return isUnlimited
    ? { limit: -1, isUnlimited: true }
    : { limit: baseLimit + addonLimit, isUnlimited: false };
}

/**
 * GET /api/admin/users/[id]/ai-quota
 * Lấy thông tin AI quota hiện tại của user
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) return json({ error: { message: 'Không được phép.' } }, 401);

    const { id } = await context.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return json({ error: { message: 'Không tìm thấy người dùng.' } }, 404);

    const { limit, isUnlimited } = await calcAILimit(id);

    if (isUnlimited) {
      return json({ data: { limit: -1, usage: 0, remaining: -1, isUnlimited: true } });
    }

    const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const redisKey = `user:ai_quota:${id}:${vnDate}`;
    const usageStr = await redis.get(redisKey);
    const usage = usageStr ? parseInt(usageStr, 10) : 0;

    return json({
      data: {
        limit,
        usage,
        remaining: Math.max(0, limit - usage),
        isUnlimited: false,
        resetAt: 'Hàng ngày lúc 00:00 (GMT+7)'
      }
    });
  } catch (error) {
    console.error('[ai-quota GET]', error);
    return json({ error: { message: 'Lỗi máy chủ.' } }, 500);
  }
}

/**
 * POST /api/admin/users/[id]/ai-quota
 * action=reset  → Reset quota về 0
 * action=add    → Cộng thêm N lượt vào usage (trừ đi thực tế là giảm usage)
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) return json({ error: { message: 'Không được phép.' } }, 401);

    // Chỉ SUPER_ADMIN và SUPPORT được quản lý quota
    if (!['SUPER_ADMIN', 'SUPPORT'].includes(admin.role)) {
      return json({ error: { message: 'Bạn không có quyền thực hiện thao tác này.' } }, 403);
    }

    const { id } = await context.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return json({ error: { message: 'Không tìm thấy người dùng.' } }, 404);

    const body = await request.json();
    const { action, amount } = body;

    const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const redisKey = `user:ai_quota:${id}:${vnDate}`;

    if (action === 'reset') {
      await redis.del(redisKey);

      await prisma.auditLog.create({
        data: {
          action: 'RESET_AI_QUOTA',
          actor: admin.email,
          target: `User #${id} (${user.email})`,
          details: `Admin reset AI quota về 0 cho ngày ${vnDate}`,
        }
      });

      return json({ data: { message: 'Đã reset quota thành công.', usage: 0 } });
    }

    if (action === 'add') {
      const addAmount = Number(amount);
      if (isNaN(addAmount) || addAmount <= 0 || addAmount > 9999) {
        return json({ error: { message: 'Số lượt không hợp lệ (1-9999).' } }, 400);
      }

      // Cấp thêm credit = giảm usage đi (nếu usage > 0) hoặc set âm (cho phép dùng thêm)
      const usageStr = await redis.get(redisKey);
      const currentUsage = usageStr ? parseInt(usageStr, 10) : 0;
      const newUsage = Math.max(0, currentUsage - addAmount);
      
      if (newUsage === 0) {
        await redis.del(redisKey);
      } else {
        await redis.set(redisKey, String(newUsage), 'KEEPTTL');
      }

      await prisma.auditLog.create({
        data: {
          action: 'ADD_AI_CREDIT',
          actor: admin.email,
          target: `User #${id} (${user.email})`,
          details: `Admin cấp thêm ${addAmount} lượt AI (usage ${currentUsage} → ${newUsage}) ngày ${vnDate}`,
        }
      });

      return json({ data: { message: `Đã cấp thêm ${addAmount} lượt AI.`, usage: newUsage } });
    }

    return json({ error: { message: 'Action không hợp lệ. Dùng reset hoặc add.' } }, 400);
  } catch (error) {
    console.error('[ai-quota POST]', error);
    return json({ error: { message: 'Lỗi máy chủ.' } }, 500);
  }
}
