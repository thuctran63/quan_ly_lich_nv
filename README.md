# PHÙNG NỒNG — Bảng điều phối lịch nhân viên

Trang web quản lý ca lịch nhân viên theo timeline trong ngày. **Mọi người dùng chung một lịch** — dữ liệu lưu JSON trên Redis (Upstash qua Vercel), không phải localStorage từng máy.

## Chạy local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API dev: http://localhost:3001 (lưu tạm trong RAM — reload server là mất)

## Deploy lên Vercel

1. Push repo lên GitHub
2. [vercel.com](https://vercel.com) → **New Project** → Import repo
3. **Storage** → Marketplace → cài **Upstash Redis** → Connect vào project
4. Deploy

Vercel tự inject `KV_REST_API_URL` và `KV_REST_API_TOKEN`. Không cần SQLite, không cần server riêng.

### Tại sao cần Redis?

Trình duyệt không thể lưu chung cho mọi người. Cần một chỗ lưu tập trung — Redis giữ JSON lịch theo ngày (`schedule:2026-06-22`). API serverless (`/api/*`) đọc/ghi Redis, frontend chỉ gọi API.

## API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/state` | Lấy lịch hôm nay |
| PUT | `/api/employees` | Lưu danh sách NV |
| POST | `/api/assignments` | Thêm ca |
| DELETE | `/api/assignments/:id` | Xóa ca |

## Cách dùng

1. Nhập danh sách nhân viên → **Lưu danh sách**
2. Chọn NV, khung giờ, mô tả → **Cập nhật**
3. Mọi người mở cùng URL → thấy cùng bảng Gantt
4. Sang ngày mới → key Redis mới, lịch trống
