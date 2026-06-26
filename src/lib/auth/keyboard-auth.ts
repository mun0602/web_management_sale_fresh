import { NextResponse } from 'next/server';
import { verifyKeyboardToken, KeyboardSessionPayload } from './keyboard-token';

/**
 * Xác thực request từ client di động (Keyboard App)
 * @returns Payload session nếu thành công, null nếu không hợp lệ
 */
export async function getAuthorizedUser(request: Request): Promise<KeyboardSessionPayload | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const session = await verifyKeyboardToken(token);
    return session;
  } catch (err) {
    console.error('Authentication helper error:', err);
    return null;
  }
}

/**
 * Trả về Response 401 mặc định
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ!' },
    { status: 401 }
  );
}
