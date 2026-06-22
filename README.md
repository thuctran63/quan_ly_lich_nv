# PHÙNG NỒNG — Bảng điều phối lịch nhân viên

Trang web quản lý ca lịch nhân viên theo timeline trong ngày. Dữ liệu lưu `localStorage`, tự reset mỗi ngày mới.

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:5173

## Build production

```bash
npm run build
npm run preview
```

## Deploy lên Vercel

1. Push repo lên GitHub
2. Vào [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Vercel tự nhận Vite (`npm run build` → `dist/`)
4. Deploy → nhận URL `*.vercel.app`

Hoặc dùng CLI:

```bash
npx vercel
```

## Cách dùng

1. Nhập danh sách nhân viên (mỗi dòng một tên) → **Lưu danh sách**
2. Chọn nhân viên, khung giờ, mô tả việc → **Cập nhật**
3. Xem timeline 0:00–24:00 — biết ngay ai bận giờ nào, làm gì
4. Sang ngày mới → dữ liệu tự xóa, nhập lại từ đầu
