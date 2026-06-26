import { cookies } from 'next/headers';
import { verifyToken, ADMIN_SESSION_COOKIE } from './token';
import prisma from '@/lib/prisma';

export async function getSessionAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Tìm kiếm trong database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (user) {
      // M-01: Kiểm tra token có bị thu hồi không
      if (user.sessionRevokedAt) {
        const tokenIssuedAt = new Date(payload.iat * 1000);
        if (tokenIssuedAt < user.sessionRevokedAt) {
          return null; // Token đã bị thu hồi
        }
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }

    // User không tồn tại trong DB → session không hợp lệ
    return null;
  } catch (error) {
    console.error('Error in getSessionAdmin:', error);
    return null;
  }
}
