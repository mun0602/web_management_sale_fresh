/**
 * L-03: In-memory rate limiter cho login endpoints.
 * Giới hạn số lần thử đăng nhập theo IP để chống brute-force.
 * 
 * Lưu ý: Rate limit này chỉ hoạt động trên 1 instance.
 * Nếu scale nhiều instance, cần dùng Redis hoặc config tại reverse proxy.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Dọn dẹp entries hết hạn mỗi 5 phút
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Kiểm tra rate limit cho 1 key (IP).
 * @returns true nếu request bị chặn (vượt quá giới hạn), false nếu OK.
 */
export function isRateLimited(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000, // 15 phút
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Window mới
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return true; // Bị chặn
  }

  return false;
}

/**
 * Lấy thời gian còn lại (giây) trước khi rate limit reset.
 */
export function getRateLimitResetSeconds(key: string): number {
  const entry = store.get(key);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}
