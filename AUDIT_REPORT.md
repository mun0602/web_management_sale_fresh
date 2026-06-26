# Báo cáo audit bảo mật — SaleKeyboard Admin Portal

**Ngày xác minh:** 2026-06-25  
**Phạm vi:** source, cấu hình, dependency, unit test và runtime auth flow  
**Kết luận:** **PASS có điều kiện cho local demo; NOT READY cho production**

## 1. Đánh giá báo cáo cũ

Bản báo cáo “ĐÃ NGHIỆM THU / APPROVED” trước đó **chưa đạt độ tin cậy** vì một số claim không đúng với implementation:

- Có secret HMAC fallback hardcode trong source.
- Có ba email/mật khẩu admin hardcode trong Route Handler.
- Test tự chép lại thuật toán token thay vì import module production, nên có thể pass dù code thật lỗi.
- Chữ ký được so sánh bằng `!==`, không constant-time.
- Cookie role client-readable và không được xác minh trước khi hiển thị.
- Demo mutation vẫn có đường submit bằng Enter dẫn tới toast success giả.
- Kết luận production “APPROVED” không phù hợp khi chưa có backend identity, RBAC endpoint-level hoặc dữ liệu thật.

Các điểm trên đã được sửa trong đợt hardening này. Báo cáo hiện tại chỉ công nhận những gì đã có bằng chứng test.

## 2. Cải thiện bảo mật đã triển khai

### Session fail-closed

- Xóa secret fallback; `ADMIN_SESSION_SECRET` bắt buộc tối thiểu 32 byte.
- Session HMAC-SHA256 chỉ chứa `sub`, `role`, `iat`, `exp` và sống tối đa 1 giờ.
- Xác minh header/algorithm, schema payload, thời hạn và TTL.
- So sánh chữ ký bằng `timingSafeEqual`.
- Cookie đổi thành `admin_session`, `HttpOnly`, `SameSite=Strict`, `Priority=High`, có `Max-Age`.
- Proxy từ chối và xóa session giả/hết hạn.

### Demo auth bị cô lập khỏi production

- Không còn credentials hardcode trong source.
- Credentials demo lấy từ environment.
- Demo login chỉ hoạt động khi `ENABLE_DEMO_AUTH=true` **và** `NODE_ENV !== production`.
- Production không có backend auth sẽ trả `503` thay vì dùng fallback.
- Credentials sai trả `401`; body sai trả `400`; body quá lớn trả `413`.
- Email/password được đối chiếu qua SHA-256 digest + constant-time comparison.
- Cross-origin login/logout bị từ chối `403`.

### Không còn role cookie phía client

- Xóa `admin_role` khỏi login flow.
- Thêm `GET /api/auth/me`, xác minh session server-side và trả DTO tối thiểu `{id, role}`.
- Sidebar lấy role từ `/api/auth/me`, không đọc `document.cookie`.
- Logout xóa session mới và cookie legacy.

### CSP và browser hardening

- Production bỏ `'unsafe-eval'`.
- `connect-src` production chỉ cho same-origin.
- Bổ sung `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`.
- Bổ sung `Permissions-Policy` tắt camera, microphone và geolocation.
- Giữ `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `noindex` và tắt `X-Powered-By`.

### Tính toàn vẹn Demo UI

- Export dashboard/users/payments không còn báo success giả.
- Submit add admin/add plan/refund luôn trả thông báo bị khóa, kể cả submit bằng Enter.
- Mutation nhạy cảm khác tiếp tục bị khóa và banner toàn cục ghi rõ dữ liệu mock.

### Test đúng module production

- `scripts/test-auth.mjs` import trực tiếp `src/lib/auth/token.ts`.
- Bao phủ token hợp lệ, signature/payload giả, token hết hạn, token malformed, algorithm không hợp lệ, secret thiếu hoặc quá ngắn.
- `.env.example` cung cấp placeholder; `.env.local` vẫn bị ignore.

## 3. Kết quả xác minh

| Kiểm tra                                  | Kết quả                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `npm test`                                | PASS — 4/4 session tests + lint + typecheck    |
| `npm run lint`                            | PASS — 0 lỗi                                   |
| `npx tsc --noEmit`                        | PASS                                           |
| `npm run build`                           | PASS — 8 page routes, 3 auth handlers, Proxy   |
| `npm audit --omit=dev`                    | PASS — 0 vulnerability                         |
| Production login khi chưa có backend auth | PASS security — `503`, không cấp cookie        |
| Forged production session                 | PASS security — `307 /login`, cookie bị xóa    |
| Dev credentials sai                       | PASS security — `401`                          |
| Dev cross-origin login                    | PASS security — `403`                          |
| Dev credentials đúng                      | PASS — `200`, chỉ cấp `admin_session` HttpOnly |
| Session hợp lệ gọi `/api/auth/me`         | PASS — `200`, DTO `{id, role}`                 |
| Session giả truy cập route admin          | PASS security — `307 /login`, cookie bị xóa    |

## 4. Finding còn lại

### HIGH-01 — Chưa có production identity/RBAC/data boundary

Production hiện fail-closed, vì vậy không còn auth bypass đang hoạt động. Tuy nhiên ứng dụng chưa thể production-ready cho đến khi:

- tích hợp `sale_keyboard_server` hoặc identity provider thật;
- lưu/rotate/revoke session server-side hoặc dùng thư viện auth đã kiểm chứng;
- kiểm tra permission trong từng Route Handler/DAL/backend endpoint;
- triển khai MFA cho `SUPER_ADMIN` và `FINANCE`;
- thay dữ liệu mock bằng API thật có authorization.

### MEDIUM-01 — Chưa có rate limit và security audit trail phân tán

Demo auth chỉ chạy local nên không thêm in-memory rate limit tạo cảm giác an toàn giả. Backend production vẫn phải có rate limit/lockout phù hợp, failed-login audit, request ID và alerting.

### MEDIUM-02 — CSP vẫn cần `'unsafe-inline'` để giữ static rendering

Production đã bỏ `'unsafe-eval'`, nhưng `script-src/style-src` vẫn có `'unsafe-inline'`. Để CSP nghiêm ngặt hơn cần nonce per-request, đồng nghĩa chuyển page sang dynamic rendering, hoặc đánh giá SRI experimental theo tài liệu Next.js 16. Đây là trade-off chưa nên thay đổi ngầm.

### MEDIUM-03 — Test auth route chưa được tự động hóa end-to-end

Unit test crypto chạy tự động; route flow đã được kiểm tra runtime thủ công bằng HTTP. Cần bổ sung integration/E2E tự khởi động server để chống regression cho `401/403/503`, cookie flags, Proxy redirect và `/auth/me`.

### MEDIUM-04 — Accessibility dialog chưa hoàn chỉnh

Modal có label, dialog semantics và Escape handling nhưng chưa có focus trap/restore focus. Đây không phải auth vulnerability nhưng ảnh hưởng quality gate sản phẩm.

### LOW-01 — Demo credentials vẫn là shared secret từ environment

Phù hợp cho local demo, không phù hợp staging dùng chung hoặc production. Không được bật demo auth trên host có thể truy cập từ mạng không tin cậy.

## 5. Trạng thái theo môi trường

| Môi trường                       | Trạng thái                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| Local demo có `.env.local` riêng | **Đạt có điều kiện**                                         |
| Shared development/staging       | **Chưa đạt** — cần identity backend và rate limit            |
| Production                       | **Không hoạt động theo thiết kế fail-closed; chưa sẵn sàng** |

## 6. Bước tiếp theo bắt buộc cho production

1. Tích hợp backend auth/session thật; không mở `ENABLE_DEMO_AUTH` ngoài local.
2. Tạo `requireSession`/`requirePermission` dùng chung tại DAL và mọi protected endpoint.
3. Thêm MFA, rotation/revocation, rate limit, failed-login audit và monitoring.
4. Thay toàn bộ dữ liệu mock, filter/export/mutation bằng API contract thật.
5. Bổ sung integration/E2E security tests và CI bắt buộc.
