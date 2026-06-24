# SaleKeyboard Admin Portal

Web quản trị nội bộ cho hệ sinh thái SaleKeyboard BĐS. Ứng dụng quản lý người dùng, gói dịch vụ, thuê bao, giao dịch, doanh thu, audit log và tình trạng hệ thống.

Landing Page nằm ở project riêng `web_landing_sale`. Backend dự kiến sử dụng `sale_keyboard_server`; frontend này không sở hữu database hoặc business logic tài chính.

## Công nghệ

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4 và CSS tùy chỉnh
- Axios
- Recharts
- Lucide React
- React Hot Toast

## Yêu cầu môi trường

- Node.js tương thích với Next.js 16
- npm
- Backend `sale_keyboard_server` đang chạy hoặc staging API khả dụng

## Cài đặt

```bash
npm install
```

Sao chép `.env.example` thành `.env.local`, thay toàn bộ placeholder và tạo
session secret ngẫu nhiên:

```bash
cp .env.example .env.local
openssl rand -base64 32
```

Demo auth chỉ hoạt động khi `ENABLE_DEMO_AUTH=true` và `NODE_ENV` không phải
`production`. Production luôn fail-closed cho đến khi tích hợp auth backend thật.
Không commit `.env.local` hoặc dùng credentials demo trong môi trường dùng chung.

## Chạy development

```bash
npm run dev
```

Mặc định truy cập `http://localhost:3000`. Nếu backend cũng dùng cổng 3000, đổi một trong hai cổng và cập nhật `NEXT_PUBLIC_API_URL`.

## Kiểm tra chất lượng

```bash
npm run lint
npm run build
```

Script test hiện kiểm tra session signing/verification, lint và typecheck. Vẫn cần
bổ sung component/E2E khi tích hợp backend thật.

## Scripts

| Script | Mục đích |
|---|---|
| `npm run dev` | Chạy development server |
| `npm run build` | Build production |
| `npm run start` | Chạy production build |
| `npm run lint` | Chạy ESLint |
| `npm test` | Chạy session tests, lint và typecheck |

## Cấu trúc hiện tại

```text
src/
  api/axiosConfig.ts
  app/
    api/auth/login/route.ts
    api/auth/logout/route.ts
    api/auth/me/route.ts
    page.tsx
    login/page.tsx
    users/page.tsx
    plans/page.tsx
    subscriptions/page.tsx
    payments/page.tsx
    audit/page.tsx
    system/page.tsx
  components/
    SidebarLayout.tsx
  lib/auth/token.ts
  proxy.ts
```

## Trạng thái

Frontend hiện là prototype UI:

- Login demo dùng credentials từ environment và session cookie được ký; bị tắt ở production.
- Dashboard và các màn hình đang dùng dữ liệu hardcode/mock.
- Chưa có identity provider/backend session thật, RBAC endpoint-level hoặc API contract đã xác nhận.
- `sale_keyboard_server` không có trong workspace hiện tại.

Không deploy production trước khi hoàn thành auth/RBAC, thay toàn bộ mock và đạt quality gate trong plan.

## Bảo mật

- Không lưu admin token hoặc role trong storage/cookie client-readable.
- Session demo dùng cookie HttpOnly và được đọc qua `/api/auth/me`.
- `ADMIN_SESSION_SECRET` bắt buộc tối thiểu 32 byte; không có fallback.
- Mọi permission phải kiểm tra tại backend.
- Không commit `.env.local`, secret hoặc dữ liệu production.
- Refund, khóa user, đổi gói và export phải có reason + audit log.

## Tài liệu

- [Kế hoạch triển khai](./plan-web-management.md)
- Quy ước project: [AGENTS.md](./AGENTS.md)
