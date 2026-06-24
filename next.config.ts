import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false, // Vô hiệu hóa X-Powered-By header (LOW-02)
  turbopack: {
    // Chỉ định root tuyệt đối cho Turbopack là thư mục dự án này để tránh cảnh báo (LOW-01)
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/keyboard',
        destination: 'http://app-override-virtual-hard-drive-rx23i1:8080/api/keyboard',
      },
      {
        source: '/api/properties/:path*',
        destination: 'http://app-override-virtual-hard-drive-rx23i1:8080/api/properties/:path*',
      },
      {
        source: '/api/property-groups/:path*',
        destination: 'http://app-override-virtual-hard-drive-rx23i1:8080/api/property-groups/:path*',
      },
      {
        source: '/api/ai/:path*',
        destination: 'http://app-override-virtual-hard-drive-rx23i1:8080/api/ai/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://app-override-virtual-hard-drive-rx23i1:8080/uploads/:path*',
      }
    ];
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data:",
      `connect-src 'self'${isDevelopment ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
