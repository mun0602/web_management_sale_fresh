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
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }

    // Fallback cho demo auth credentials
    return {
      id: payload.sub,
      email: process.env.DEMO_ADMIN_EMAIL || 'admin@example.com',
      role: payload.role,
      name: 'Demo Admin',
    };
  } catch (error) {
    console.error('Error in getSessionAdmin:', error);
    return null;
  }
}
