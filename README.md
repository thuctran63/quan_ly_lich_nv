# PHÙNG NỒNG — Bảng điều phối lịch nhân viên

Trang web quản lý ca lịch nhân viên theo timeline trong ngày. **Mọi người dùng chung một lịch** — dữ liệu lưu trên **MongoDB Atlas**.

## Setup MongoDB (1 lần)

1. Tạo free cluster tại [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Database Access** → tạo user + password
3. **Network Access** → Add IP `0.0.0.0/0` (cho phép Vercel kết nối)
4. **Connect** → Drivers → copy connection string
5. Tạo file `.env` từ `.env.example`, dán URI (thay `USER` / `PASSWORD`)

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/phungnong?retryWrites=true&w=majority
```

## Chạy local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## Deploy lên Vercel

1. Push repo lên GitHub
2. [vercel.com](https://vercel.com) → **New Project** → Import repo
3. **Settings → Environment Variables** → thêm `MONGODB_URI` (cùng URI như `.env`)
4. Deploy

Vercel tự chạy API trong thư mục `/api` + serve frontend từ `dist/`.

## Cấu trúc data

Collection `schedules` — **1 document mỗi ngày**:

```json
{
  "_id": "2026-06-22",
  "date": "2026-06-22",
  "employees": ["Nguyễn Văn A"],
  "assignments": [
    { "id": "...", "employee": "Nguyễn Văn A", "start": "08:00", "end": "10:00", "task": "Đi chợ" }
  ]
}
```

Data ngày cũ tự xóa khi có request mới.

## API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/state` | Lấy lịch hôm nay |
| PUT | `/api/employees` | Lưu danh sách NV |
| POST | `/api/assignments` | Thêm ca |
| DELETE | `/api/assignments/:id` | Xóa ca |
