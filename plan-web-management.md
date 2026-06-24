# Kế hoạch triển khai SaleKeyboard Admin Portal

## 1. Mục tiêu dự án

`web_management_sale` là web quản trị nội bộ cho hệ sinh thái SaleKeyboard BĐS. Dự án chịu trách nhiệm:

- Quản lý người dùng và trạng thái tài khoản.
- Quản lý gói dịch vụ, bảng giá và thuê bao.
- Theo dõi giao dịch, hoàn tiền và doanh thu.
- Hiển thị KPI vận hành: MRR, ARPU, churn, trial conversion.
- Tra cứu audit log và tình trạng hệ thống.
- Phân quyền nhân sự quản trị.

Landing Page là dự án riêng tại `web_landing_sale`; không đưa nội dung marketing, SEO hoặc form lead vào Admin Portal.

Backend chính tiếp tục là `sale_keyboard_server`. Không tạo database hoặc business logic tài chính thứ hai trong Next.js.

---

## 2. Trạng thái hiện tại

### Công nghệ

| Thành phần | Hiện trạng |
|---|---|
| Framework | Next.js 16.2.9, App Router |
| UI | React 19.2.4, TypeScript, Tailwind CSS 4 và CSS tùy chỉnh |
| HTTP | Axios 1.18.1 |
| Biểu đồ | Recharts 3.9.0 |
| Icon/notification | Lucide React, React Hot Toast |
| Backend | Dự kiến `sale_keyboard_server`, hiện không có trong workspace này |

### Màn hình đã có khung

- Dashboard tại `src/app/page.tsx`.
- Login tại `src/app/login/page.tsx`.
- Người dùng tại `src/app/users/page.tsx`.
- Gói dịch vụ tại `src/app/plans/page.tsx`.
- Thuê bao tại `src/app/subscriptions/page.tsx`.
- Giao dịch tại `src/app/payments/page.tsx`.
- Audit tại `src/app/audit/page.tsx`.
- System Health tại `src/app/system/page.tsx`.
- Layout/sidebar tại `src/components/SidebarLayout.tsx`.
- Auth guard tại `src/components/AuthGuard.tsx`.
- Axios client tại `src/api/axiosConfig.ts`.

### Khoảng trống cần xử lý

1. Dashboard đang dùng `mockChartData` và KPI hardcode tại `src/app/page.tsx:7-92`.
2. Login đang ghi `mock_token_123` vào localStorage tại `src/app/login/page.tsx:15-16`.
3. AuthGuard chỉ kiểm tra sự tồn tại của localStorage, không xác minh session tại `src/components/AuthGuard.tsx:11-21`.
4. Axios interceptor tiếp tục dùng bearer token trong localStorage tại `src/api/axiosConfig.ts:9-18`.
5. Logout trong sidebar chưa có handler tại `src/components/SidebarLayout.tsx:77-81`.
6. Header đang hardcode `Super Admin` thay vì session thật tại `src/components/SidebarLayout.tsx:97-102`.
7. Các trang CRUD hiện mới là UI demo, chưa có contract/API/loading/error/pagination hoàn chỉnh.
8. README trước đây là nội dung mặc định của `create-next-app`, chưa mô tả dự án.

---

## 3. Ranh giới kiến trúc

```text
admin.salekeyboard.vn
  web_management_sale (Next.js)
          │
          │ HTTPS /api/*
          ▼
  sale_keyboard_server
          │
          ├── Auth + RBAC
          ├── Users + Plans + Subscriptions
          ├── Payments + Refunds + Metrics
          ├── Audit + System Health
          └── Database + Payment Provider
```

### Trách nhiệm của frontend

- Render giao diện và trạng thái tương tác.
- Validate dữ liệu để hỗ trợ UX; server vẫn phải validate lại.
- Gọi API, xử lý loading/error/empty state.
- Ẩn/hiện tính năng theo permission để cải thiện UX.
- Format tiền VND và thời gian Asia/Ho_Chi_Minh.
- Không tự tính ledger tài chính hoặc quyết định authorization.

### Trách nhiệm của `sale_keyboard_server`

- Xác thực session và phân quyền trên từng endpoint.
- Lưu user, plan, subscription, invoice, payment và refund.
- Tính KPI bằng một metrics service thống nhất.
- Xử lý webhook idempotent và đối soát payment provider.
- Ghi audit cho mọi hành động nhạy cảm.
- Không tin role, amount, plan hoặc user ID do frontend tự khai báo.

### Kết nối production

Ưu tiên reverse proxy cùng origin:

```text
https://admin.salekeyboard.vn/api/* -> sale_keyboard_server
```

Frontend gọi URL tương đối `/api`. Cách này đơn giản hóa cookie, CORS và CSRF hơn việc gọi trực tiếp domain khác.

---

## 4. Xác thực và phân quyền

### Session

- Không lưu access token quản trị trong localStorage.
- Backend phát cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- Access session sống ngắn; refresh token rotation và revoke phía server.
- Axios đặt `withCredentials: true` và xử lý `401` tập trung.
- App gọi `GET /api/admin/auth/me` khi khởi động để xác minh session.
- Logout gọi server rồi mới chuyển về `/login`.
- Route protection phải có cả phía Next middleware/server và API backend; client guard chỉ hỗ trợ UX.

### Vai trò

| Vai trò | Quyền chính |
|---|---|
| `SUPER_ADMIN` | Toàn quyền, quản lý role/admin khác |
| `FINANCE` | Doanh thu, payment, refund và export |
| `SUPPORT` | Hồ sơ/status user, revoke session; không refund |
| `READ_ONLY` | Chỉ xem dashboard được cấp |

Permission đề xuất:

- `dashboard.read`
- `users.read`, `users.status.write`, `users.sessions.revoke`
- `plans.read`, `plans.write`
- `subscriptions.read`, `subscriptions.adjust`
- `payments.read`, `payments.refund`
- `reports.export`
- `audit.read`
- `system.read`
- `admins.manage`

Frontend không được coi việc ẩn menu là authorization. API phải trả `403` khi role không đủ quyền.

### Bảo mật bắt buộc trước production

- `JWT_SECRET`/session secret bắt buộc từ environment; không có fallback.
- Không tạo tài khoản `admin/123456` mặc định.
- MFA cho `SUPER_ADMIN` và `FINANCE`.
- Rate limit login, lockout có kiểm soát và audit failed login.
- CSRF protection cho mọi mutation dùng cookie.
- CSP, `X-Frame-Options`/`frame-ancestors`, `noindex` cho admin.
- Không trả stack trace hoặc database error cho frontend.

---

## 5. Contract API

Contract dưới đây là yêu cầu cho `sale_keyboard_server`. Vì backend không có trong workspace hiện tại, endpoint phải được xác nhận trước khi nối dữ liệu thật.

### Auth

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/refresh`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/mfa/verify`

`/me` trả tối thiểu:

```json
{
  "id": "admin-id",
  "name": "Admin Name",
  "email": "admin@example.com",
  "roles": ["SUPER_ADMIN"],
  "permissions": ["dashboard.read", "users.read"]
}
```

### Dashboard

- `GET /api/admin/dashboard/summary?from=&to=&timezone=`
- `GET /api/admin/revenue/timeseries?from=&to=&interval=day|week|month`
- `GET /api/admin/revenue/by-plan?from=&to=`
- `GET /api/admin/subscriptions/funnel?from=&to=`
- `GET /api/admin/subscriptions/cohorts?from=&to=`

### Người dùng

- `GET /api/admin/users?q=&status=&planId=&page=&limit=&sort=`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `POST /api/admin/users/:id/revoke-sessions`
- `GET /api/admin/users/:id/subscriptions`
- `GET /api/admin/users/:id/audit`

### Gói và thuê bao

- `GET/POST /api/admin/plans`
- `GET/PATCH /api/admin/plans/:id`
- `POST /api/admin/plans/:id/prices`
- `GET /api/admin/subscriptions`
- `GET /api/admin/subscriptions/:id`
- `POST /api/admin/subscriptions/:id/adjust`
- `POST /api/admin/subscriptions/:id/cancel`

Giá đã xuất hiện trong invoice không được sửa; tạo price version mới.

### Payment và refund

- `GET /api/admin/payments`
- `GET /api/admin/payments/:id`
- `POST /api/admin/payments/:id/refunds`
- `GET /api/admin/invoices/:id`
- `GET /api/admin/reports/revenue.csv`

### Audit và hệ thống

- `GET /api/admin/audit-logs`
- `GET /api/admin/system/health`
- `GET /api/admin/system/webhooks`
- `GET /api/admin/system/reconciliation`

### Quy ước response

Success:

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "fields": {}
  },
  "requestId": "request-id"
}
```

---

## 6. Định nghĩa số liệu doanh thu

- `Gross collected revenue`: tổng payment trạng thái `succeeded` trong kỳ.
- `Refund`: tổng refund trạng thái thành công trong kỳ.
- `Net collected revenue`: gross − refund; phí provider hiển thị riêng.
- `MRR`: tổng giá trị tháng của subscription active; gói năm chia 12.
- `ARPU`: MRR / số subscription trả phí active cuối kỳ.
- `Logo churn`: subscription hủy trong kỳ / subscription active đầu kỳ.
- `Trial conversion`: user chuyển paid / trial hợp lệ kết thúc trong kỳ.

Quy tắc:

- Database lưu UTC; UI mặc định `Asia/Ho_Chi_Minh`.
- Tiền dùng integer VND, không dùng floating point.
- Dashboard không tự cộng dữ liệu payment phía client.
- Export CSV và card KPI phải dùng cùng metrics service/query phía server.
- Refund không xóa payment gốc.

---

## 7. Thiết kế frontend

### Cấu trúc đề xuất

```text
src/
  app/
    (auth)/login/
    (portal)/layout.tsx
    (portal)/page.tsx
    (portal)/users/
    (portal)/plans/
    (portal)/subscriptions/
    (portal)/payments/
    (portal)/audit/
    (portal)/system/
  api/
    client.ts
    auth.ts
    dashboard.ts
    users.ts
    plans.ts
    subscriptions.ts
    payments.ts
    audit.ts
    system.ts
  components/
    layout/
    tables/
    filters/
    forms/
    feedback/
    charts/
  hooks/
  lib/
    auth/
    permissions/
    currency/
    datetime/
    csv/
  types/
```

Không bắt buộc di chuyển toàn bộ file ngay. Refactor theo từng màn hình khi nối API để diff nhỏ và kiểm thử được.

### Chuẩn UI

- Server-side pagination, filter và sort cho bảng lớn.
- Filter phản ánh trên URL query để refresh/back/share không mất trạng thái.
- Có loading skeleton, empty state, error state và retry.
- Mutation nguy hiểm yêu cầu confirm, lý do và mô tả hậu quả.
- Amount luôn kèm currency; chart luôn kèm kỳ và timezone.
- Không dùng `alert()` cho thao tác production.
- Responsive desktop/tablet; mobile cho tác vụ xem nhanh, không tối ưu refund phức tạp.

### State và dữ liệu

- Giữ Axios hiện có; chưa thêm dependency data-fetching nếu chưa cần.
- Tạo API module typed theo domain, không gọi Axios trực tiếp rải rác trong page.
- Chống double-submit cho mutation.
- Hủy request cũ khi filter/search thay đổi nhanh.
- Không cache lâu dữ liệu tài chính nhạy cảm trên client.

---

## 8. Kế hoạch triển khai

### Giai đoạn 0 — Chốt backend và quality baseline

1. Khôi phục/đưa `sale_keyboard_server` vào workspace hoặc cung cấp OpenAPI/schema endpoint.
2. Chốt base URL dev/staging/production và reverse proxy.
3. Chốt RBAC matrix, metrics formulas và timezone.
4. Chạy baseline `npm run lint`, `npm run build`; ghi lại lỗi hiện có.
5. Thêm test scripts và CI tối thiểu trước khi thay mock.

### Giai đoạn 1 — Auth thật

1. Thay login mock bằng `POST /api/admin/auth/login`.
2. Chuyển từ localStorage bearer token sang HttpOnly cookie.
3. Tạo session provider/hook từ `/auth/me`.
4. Tách auth layout và portal layout để login không render sidebar.
5. Thực hiện logout/revoke và xử lý `401/403`.
6. Render tên/role/permission thật trong header.

### Giai đoạn 2 — API foundation

1. Chuẩn hóa Axios client, credentials, error mapping và request ID.
2. Tạo TypeScript types cho response/error/pagination.
3. Tạo API module theo domain.
4. Tạo reusable table/filter/date-range/pagination.
5. Tạo permission guard cho route và action.

### Giai đoạn 3 — Dashboard

1. Xóa toàn bộ KPI/chart mock trong `src/app/page.tsx`.
2. Kết nối summary và timeseries API.
3. Đồng bộ date range với URL.
4. Chuẩn hóa VND/timezone/comparison.
5. Export CSV qua endpoint report thật.
6. Thêm loading/empty/error/partial-data state.

### Giai đoạn 4 — Người dùng

1. Kết nối list/search/filter/pagination.
2. Xây user detail: profile, subscription, payment và audit timeline.
3. Khóa/mở tài khoản có reason.
4. Revoke session và yêu cầu đổi mật khẩu.
5. Không hiển thị password, token hoặc content riêng tư.

### Giai đoạn 5 — Gói và thuê bao

1. Kết nối plan list/create/edit.
2. Tạo price version thay vì sửa lịch sử giá.
3. Kết nối subscription list/detail/status.
4. Adjustment/cancel yêu cầu permission, reason và confirm.
5. Hiển thị lịch sử thay đổi từ audit.

### Giai đoạn 6 — Payment và refund

1. Kết nối payment list/detail/filter.
2. Hiển thị invoice, provider event và reconciliation status.
3. Refund toàn phần/một phần chỉ cho `payments.refund`.
4. Chống double-submit và dùng idempotency key.
5. Export phản ánh đúng filter UI.

### Giai đoạn 7 — Audit và System Health

1. Kết nối audit log với filter actor/action/resource/date.
2. Ẩn details nhạy cảm theo permission.
3. Kết nối API/database/storage/AI/payment health.
4. Hiển thị failed webhook và reconciliation mismatch.
5. Thêm link request ID để tra log server.

### Giai đoạn 8 — Hardening và release

1. Security review auth, RBAC, CSRF, XSS, CSV injection và refund.
2. Accessibility review và keyboard navigation.
3. E2E theo từng role.
4. Load test API báo cáo với dữ liệu mục tiêu.
5. Build production, staging UAT, rollback plan và monitoring.

---

## 9. Tiêu chí nghiệm thu

### Auth và RBAC

- Không có `mock_token_123` hoặc bearer token trong localStorage.
- User chưa login không xem được portal và API trả `401`.
- Role thiếu permission nhận `403` khi gọi API trực tiếp.
- Logout/revoke làm session cũ hết hiệu lực.
- Header/menu/action phản ánh đúng session và permission thật.
- MFA bắt buộc với `SUPER_ADMIN` và `FINANCE` trên production.

### Dashboard

- Không còn KPI hoặc chart hardcode.
- Thay đổi date range tạo request đúng `from/to/timezone`.
- KPI và CSV khớp cùng server metrics cho một fixture xác định.
- Dashboard summary p95 < 500 ms với 100.000 payment sau warm cache/snapshot.
- Tiền và ngày hiển thị đúng VND/Asia/Ho_Chi_Minh.

### CRUD quản trị

- User search/filter/sort/pagination giữ được sau refresh URL.
- Mutation thiếu reason hoặc permission bị từ chối.
- Plan price đã dùng trong invoice không bị sửa trực tiếp.
- Refund gửi lại cùng idempotency key không tạo refund trùng.
- Mọi khóa user, đổi subscription, refund và export có audit record.

### UX và chất lượng

- Tất cả trang có loading, empty, error và retry state.
- Modal nguy hiểm hỗ trợ keyboard, focus trap và restore focus.
- `npm run lint` pass.
- `npm run build` pass.
- TypeScript không có lỗi.
- E2E critical flows pass trên Chromium.
- Không có high/critical vulnerability chưa được chấp nhận bằng văn bản.

---

## 10. Kế hoạch kiểm thử

### Unit

- Format VND và timezone boundaries.
- Permission matcher.
- API error mapping.
- Form validation và idempotency key generation.
- Hiển thị KPI khi dữ liệu thiếu/null.

### Integration/component

- Session bootstrap, login, logout và refresh.
- Bảng với filter/pagination/sort.
- Mutation success/error/conflict.
- Permission ẩn action nhưng vẫn xử lý `403` từ server.
- Refund modal và reason validation.

### E2E

- `SUPER_ADMIN`: login → dashboard → user → subscription adjustment.
- `FINANCE`: payment → refund → audit.
- `SUPPORT`: khóa user nhưng không refund được.
- `READ_ONLY`: xem nhưng không mutation/export trái quyền.
- Session hết hạn giữa thao tác.
- Backend unavailable/timeout/partial failure.

### Backend contract

- Auth/RBAC trên từng endpoint.
- Metrics fixture cho MRR, ARPU, churn và refund.
- Webhook idempotency.
- CSV injection protection.
- Audit completeness.

---

## 11. Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Backend không có trong workspace | Chốt OpenAPI/contract và staging endpoint trước Giai đoạn 1 |
| Frontend tin localStorage token | HttpOnly cookie, `/auth/me`, server-side route protection |
| Role chỉ bị ẩn ở UI | RBAC bắt buộc tại `sale_keyboard_server` và integration test |
| KPI frontend/server lệch nhau | Một metrics service server, fixture và reconciliation |
| Refund trùng | Idempotency key, disable submit, server transaction |
| Plan price làm sai lịch sử | Price version immutable |
| CSV công thức độc hại | Escape cell bắt đầu bằng `=`, `+`, `-`, `@` |
| Dashboard chậm | Server aggregation, index, daily snapshot và pagination |
| Dữ liệu tài chính bị cache | No-store/private cache policy và không persist client |
| Mock bị đưa lên production | CI kiểm tra marker mock/hardcode và E2E staging |

---

## 12. Ngoài phạm vi MVP

- Landing Page và CMS marketing.
- Hệ thống kế toán đầy đủ.
- Hóa đơn điện tử và kê khai thuế.
- Multi-currency.
- Affiliate payout.
- Revenue forecasting bằng AI.
- Cho khách hàng cuối truy cập Admin Portal.

Các yêu cầu hóa đơn điện tử, thuế và ghi nhận doanh thu kế toán phải được kế toán/pháp lý xác nhận riêng.

---

## 13. Definition of Done

Một giai đoạn chỉ hoàn thành khi:

1. API contract đã xác nhận và typed trong frontend.
2. Không còn mock trong phạm vi giai đoạn.
3. Happy path, error path và permission path đều có test.
4. Lint, typecheck, build và test pass.
5. Không có lỗi console/browser trong critical flow.
6. Audit/observability đủ để điều tra lỗi production.
7. Tài liệu README và biến môi trường được cập nhật.

Thứ tự triển khai bắt buộc: **backend contract → auth/RBAC → API foundation → dashboard → CRUD → payment/refund → audit/system → hardening**.
