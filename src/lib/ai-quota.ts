import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

export interface AIQuotaResult {
  allowed: boolean;
  limit: number;
  current: number;
}

// Lua script: atomic check-and-increment để tránh race condition
const LUA_CHECK_AND_INCR = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return -1
end
local newVal = redis.call('INCR', key)
if newVal == 1 then
  redis.call('EXPIRE', key, 86400)
end
return newVal
`;

/**
 * Kiểm tra và tăng hạn mức AI Quota cho user.
 * - Tính limit từ Plan.features (ai_unlimited, ai_limit:N, ai_addon:N)
 * - Dùng Lua script atomic trên Redis để tránh race condition
 * - Sử dụng múi giờ Việt Nam (UTC+7) cho ngày reset
 */
export async function checkAndIncrAIQuota(userId: string): Promise<AIQuotaResult> {
  // 1. Lấy tất cả subscriptions còn hạn
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: userId,
      status: 'active',
      endDate: { gt: new Date() }
    },
    include: {
      plan: true
    }
  });

  let limit = 5; // Mặc định 5 lượt/ngày cho Free
  let isUnlimited = false;

  if (subscriptions && subscriptions.length > 0) {
    let baseLimit = 5;
    let addonLimit = 0;

    for (const sub of subscriptions) {
      const features = sub.plan.features || '';
      if (features.includes('ai_unlimited')) {
        isUnlimited = true;
        limit = -1;
        break;
      }

      const parts = features.split(',');
      for (let f of parts) {
        f = f.trim();
        if (f.startsWith('ai_limit:')) {
          const l = parseInt(f.substring('ai_limit:'.length), 10);
          if (!isNaN(l) && l > baseLimit) {
            baseLimit = l;
          }
        }
        if (f.startsWith('ai_addon:')) {
          const a = parseInt(f.substring('ai_addon:'.length), 10);
          if (!isNaN(a)) {
            addonLimit += a;
          }
        }
      }
    }

    if (!isUnlimited) {
      limit = baseLimit + addonLimit;
    }
  }

  if (isUnlimited) {
    return { allowed: true, limit: -1, current: 0 };
  }

  // 2. Kiểm tra lượt dùng trong ngày (theo giờ Việt Nam UTC+7)
  const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const redisKey = `user:ai_quota:${userId}:${vnDate}`;

  // 3. Atomic check-and-increment bằng Lua script (tránh race condition)
  const result = await redis.eval(LUA_CHECK_AND_INCR, 1, redisKey, limit) as number;

  if (result === -1) {
    // Đã vượt quota — lấy current count để trả về
    const currentStr = await redis.get(redisKey);
    const current = currentStr ? parseInt(currentStr, 10) : limit;
    return { allowed: false, limit, current };
  }

  return { allowed: true, limit, current: result };
}
