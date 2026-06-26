---
name: apk-uploader
description: >-
  Hướng dẫn chi tiết cho các AI Agent thực hiện tự động hóa quy trình quản lý,
  kiểm thử, tải lên (upload) và tải xuống (download) các phiên bản APK ứng dụng
  SaleKeyboard thông qua Web Management Portal API.
---

# APK Uploader

## Overview
Skill này hướng dẫn các AI Agent cách tương tác tự động với API quản lý APK của hệ thống `web_management_sale`. Hệ thống hỗ trợ lưu trữ tệp tin phiên bản ứng dụng Android, đánh số phiên bản tự động tăng (`version_code`), và tải xuống trực tiếp thông qua luồng stream nhị phân an toàn.

## Dependencies
- **Next.js Route Handlers**: `/api/apk/upload`, `/api/apk/list`, `/api/apk/latest`, `/api/apk/download/[id]`.
- **Environment Variable**: `APK_UPLOAD_API_KEY` (được cấu hình trong `.env` ở máy local và Dokploy production).

## Quick Start
Để kiểm tra nhanh API upload bằng lệnh `curl`:
```bash
curl -X POST \
  -H "x-api-key: <APK_UPLOAD_API_KEY>" \
  -F "apk=@/path/to/app-release.apk" \
  -F "version_name=1.0.4" \
  -F "changelog=Bản cập nhật thử nghiệm" \
  -F "uploader=AI Agent" \
  https://munbds.shop/api/apk/upload
```

---

## API Endpoints

### 1. Upload APK (`POST /api/apk/upload`)
- **Mô tả**: Tải tệp tin APK mới lên server.
- **Bảo mật**: Bắt buộc gửi kèm Header `x-api-key` khớp với biến môi trường `APK_UPLOAD_API_KEY`.
- **Dữ liệu gửi (multipart/form-data)**:
  - `apk` (File nhị phân - Bắt buộc)
  - `version_name` (Chuỗi phiên bản, ví dụ `1.0.0` - Bắt buộc)
  - `changelog` (Mô tả thay đổi - Tùy chọn)
  - `uploader` (Tên người tải lên - Tùy chọn)
- **Response mẫu (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Upload thành công",
    "data": {
      "id": "20c06a2a-0da9-42d1-b608-7ca9137be409",
      "version_code": 4,
      "version_name": "1.0.4"
    }
  }
  ```

### 2. Danh sách APK (`GET /api/apk/list`)
- **Mô tả**: Lấy danh sách toàn bộ các phiên bản đã tải lên.
- **Bảo mật**: Public (Không cần API key).
- **Response mẫu (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "20c06a2a-0da9-42d1-b608-7ca9137be409",
        "version_name": "1.0.4",
        "version_code": 4,
        "file_name": "sale_keyboard_1782492617412.apk",
        "file_size": "26",
        "changelog": "Test sau khi add API Key",
        "uploader": "Antigravity",
        "created_at": "2026-06-26T16:50:17.391Z",
        "download_url": "/api/apk/download/20c06a2a-0da9-42d1-b608-7ca9137be409"
      }
    ]
  }
  ```

### 3. Bản mới nhất (`GET /api/apk/latest`)
- **Mô tả**: Lấy thông tin bản APK có `version_code` cao nhất.
- **Bảo mật**: Public.

### 4. Tải xuống APK (`GET /api/apk/download/[id]`)
- **Mô tả**: Tải về tệp tin APK nhị phân tương ứng với `id`.
- **Bảo mật**: Public (người dùng và ứng dụng Android tự tải trực tiếp).
- **Hỗ trợ Tải bản mới nhất**: Để tải về phiên bản mới nhất mà không cần truyền ID cụ thể, hãy truyền tham số `id` là `latest`. Ví dụ:
  `GET /api/apk/download/latest`
- **Response**: Trả về trực tiếp luồng nhị phân với Header:
  - `Content-Type: application/vnd.android.package-archive`
  - `Content-Disposition: attachment; filename="sale_keyboard_xxx.apk"`

---

## Workflow dành cho AI Agent

Khi được yêu cầu kiểm thử hoặc tải lên phiên bản APK tự động, AI Agent thực hiện các bước sau:

1. **Lấy API Key**:
   - Sử dụng công cụ đọc file để đọc tệp `.env` ở thư mục gốc của dự án.
   - Tìm dòng chứa biến `APK_UPLOAD_API_KEY`.
2. **Kiểm tra file APK**:
   - Xác minh file APK tồn tại trên máy local.
3. **Thực thi tải lên**:
   - Gửi yêu cầu HTTP POST sử dụng thư viện thích hợp (hoặc `curl`) kèm Header `x-api-key: <giá_trị_api_key_vừa_lấy>`.
4. **Kiểm thử**:
   - Lấy ID từ phản hồi tải lên.
   - Gửi request `GET` đến endpoint tải xuống của ID đó để xác nhận luồng stream file không bị gián đoạn và trả về đúng header nhị phân.

---

## Common Mistakes và Lưu ý quan trọng
- **Lưu ý về Hostname trong Docker**: Next.js Route Handler khi chạy trong Dokploy Docker container bị phân giải hostname nội bộ (`http://container-id:3000`). Vì thế, **không được sử dụng NextResponse.redirect** đến thư mục tĩnh public. Bắt buộc phải dùng cơ chế đọc file từ đĩa bằng `fs.readFile` và trả về trực tiếp luồng nhị phân.
- **Phân quyền thư mục ghi**: Docker runner chạy dưới quyền user `nextjs` (non-root). Bất kỳ tệp tin nào được tải lên sẽ ghi vào `/app/public/downloads/apk`. `Dockerfile` cần thiết lập:
  `RUN mkdir -p public/downloads/apk && chown -R nextjs:nodejs public`
  trước khi chuyển sang `USER nextjs` để tránh lỗi `EACCES: permission denied`.
