# 🛵 LINE Delivery — ระบบสั่งอาหาร Delivery ผ่าน LINE LIFF

ระบบสั่งอาหาร Delivery แบบครบวงจรที่ทำงานใน LINE App ผ่าน LIFF (LINE Front-end Framework)  
Frontend: React + Vite + Tailwind · Backend: FastAPI · Database: Supabase (PostgreSQL + Realtime)

---

## 📐 Architecture

```
LINE App (LIFF)
    │
    ▼
React Frontend (Vite + Tailwind)
    ├── useLiff.js        ← LINE profile / auth
    ├── useRole.js        ← role + realtime permission
    └── Pages
        ├── OrderForm          ← ลูกค้าสั่งสินค้า
        ├── MerchantDashboard  ← ร้านค้าจัดการออเดอร์ + เมนู
        ├── RiderDashboard     ← ไรเดอร์รับ-ส่งงาน
        └── AdminPanel         ← จัดการสิทธิ์ users
    │
    ├── Supabase (direct)   ← orders, menu_items, users, points
    └── FastAPI Backend     ← LINE Webhook, Push Message, Rich Menu
```

---

## 👥 Roles

| Role | สิทธิ์ | หน้าที่เข้าได้ |
|------|--------|--------------|
| `customer` | default | สั่งสินค้า, ติดตามออเดอร์ |
| `merchant` | จัดการร้าน | + MerchantDashboard |
| `rider` | ส่งสินค้า | + RiderDashboard |
| `admin` | ทุกอย่าง | + AdminPanel + ทุกหน้า |

Role เปลี่ยนได้ real-time ผ่าน AdminPanel — ผู้ใช้ไม่ต้อง refresh

---

## 🗄️ Database Schema (Supabase)

```sql
users          — LINE profile + role + is_active
orders         — ออเดอร์ทั้งหมด (status, items_detail, lat/lng)
menu_items     — เมนูอาหาร (ร้านค้าจัดการได้)
saved_addresses — ที่อยู่บันทึก per user
user_points    — loyalty points
flash_deals    — โปรโมชั่นระยะเวลา
```

### Order Status Flow
```
รอร้านยืนยัน → กำลังทำ → กำลังจัดส่ง → ส่งสำเร็จ
                                       └→ ยกเลิก
```

---

## 🚀 Setup

### 1. Clone & Install

```bash
# Frontend
npm install

# Backend
pip install fastapi uvicorn httpx python-dotenv Pillow
```

### 2. Environment Variables

**Frontend** — `.env`
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_LIFF_ID=1234567890-xxxxxxxx
VITE_API_URL=https://your-backend.railway.app
```

**Backend** — `.env`
```env
LINE_CHANNEL_SECRET=xxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxx
LIFF_ID=1234567890-xxxxxxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role key เท่านั้น
```

### 3. Supabase Setup

รัน SQL ใน Supabase SQL Editor:

```sql
-- สร้าง tables ทั้งหมด (ดูใน schema.sql)
-- จากนั้น:
ALTER TABLE users ADD COLUMN IF NOT EXISTS role      text    DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;

-- เปิด RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
```

เปิด Realtime สำหรับ tables: `orders`, `menu_items`, `users`  
ไปที่ Dashboard → Database → Replication

### 4. LINE Setup

1. สร้าง LINE Messaging API channel ใน [LINE Developers](https://developers.line.biz)
2. สร้าง LIFF app → ใส่ URL ของ frontend → คัดลอก LIFF ID
3. ตั้ง Webhook URL: `https://your-backend/webhook`
4. เปิด "Use webhook" และ "Allow bot to join group chats"

### 5. Run

```bash
# Frontend
npm run dev

# Backend
uvicorn main:app --reload --port 8000
```

---

## 📁 Project Structure

```
├── src/
│   ├── App.jsx                 ← Router + Auth + Role gate
│   ├── hooks/
│   │   ├── useLiff.js          ← LIFF init (dev/prod)
│   │   └── useRole.js          ← Role + Realtime subscription
│   ├── lib/
│   │   └── supabase.js         ← Supabase client
│   └── pages/
│       ├── OrderForm.jsx       ← สั่งสินค้า + ติดตาม + โปรไฟล์
│       ├── MerchantDashboard.jsx ← ออเดอร์ + เมนู + Flash Deals + Analytics
│       ├── RiderDashboard.jsx  ← งาน + ประวัติ + รายได้
│       └── Adminpanel.jsx      ← จัดการ users + roles
├── main.py                     ← FastAPI: Webhook + Push + Rich Menu
└── rich_menu.png               ← Auto-generated (Pillow)
```

---

## 🔔 LINE Features

### Rich Menu
สร้าง/อัปเดตอัตโนมัติตอน server start  
2 ปุ่ม: สั่งสินค้า · หน้าร้านค้า

### Push Notifications (automatic)
| เหตุการณ์ | ผู้รับ |
|----------|--------|
| สร้างออเดอร์ | ลูกค้า ← ยืนยันรับออเดอร์ + รายละเอียด |
| เปลี่ยน status | ลูกค้า ← แจ้งสถานะใหม่ |
| ยกเลิกออเดอร์ | ลูกค้า ← แจ้งยกเลิก + เหตุผล |

### Webhook Commands
ผู้ใช้พิมพ์ใน LINE chat:
- `สั่งสินค้า` / `เมนู` → เปิดหน้าสั่ง
- `สถานะ` → แสดงออเดอร์ล่าสุด
- `ร้านค้า` → เปิดหน้าร้าน
- `ช่วยเหลือ` → แสดงคำสั่งทั้งหมด

---

## 🌐 Deploy

### Frontend (Vercel / Netlify)
```bash
npm run build
# upload dist/ หรือ connect GitHub repo
```

### Backend (Railway / Render)
```bash
# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## 💳 Payment

ปัจจุบันรองรับ 3 วิธี (COD / manual):
- `cash` — เงินสดปลายทาง
- `transfer` — โอนเงินธนาคาร (manual confirm)
- `promptpay` — QR PromptPay (manual confirm)

ดูหัวข้อ **การพัฒนาระบบชำระเงิน** สำหรับ roadmap การ integrate payment gateway

---

## 🛡️ Security Notes

- `SUPABASE_SERVICE_KEY` ใช้ **backend เท่านั้น** ห้าม expose ใน frontend
- Frontend ใช้ `SUPABASE_ANON_KEY` + RLS policies
- LINE Signature verify ทุก webhook request
- Role check ทั้ง frontend (UI gate) และ backend (API) ควรเพิ่มในอนาคต

---

## 📝 License

MIT