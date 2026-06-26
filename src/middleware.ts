import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyToken } from './lib/auth/token';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  // Xác thực token bằng chữ ký số và kiểm tra thời hạn (exp)
  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = !!session;

  const isLoginPage = pathname === '/login';

  // Nếu chưa đăng nhập (hoặc token giả mạo/hết hạn) -> Chuyển hướng về login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Dọn dẹp cookie nếu token không hợp lệ để tránh vòng lặp
    if (token) {
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_role');
    }
    return response;
  }

  // Nếu đã đăng nhập và cố gắng vào lại trang login -> Quay về trang chủ
  if (isAuthenticated && isLoginPage) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các request paths trừ các path bắt đầu bằng:
     * - api (các endpoint API nội bộ)
     * - _next/static (các tệp tĩnh)
     * - _next/image (tối ưu hóa hình ảnh)
     * - favicon.ico (icon trình duyệt)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
