# 🛵 LINE Delivery — ระบบสั่งอาหารผ่าน LINE LIFF

ระบบ Delivery สำหรับ LINE OA ที่รองรับ **3 บทบาท**: ลูกค้า · ร้านค้า · ไรเดอร์  
สร้างบน React (LIFF) + FastAPI + Supabase + LINE Messaging API

---

## 🗂️ โครงสร้าง Project

```
📦 line-delivery/
├── 🖥️  frontend/                   (React + Vite + Tailwind)
│   └── src/
│       ├── App.jsx                 ← Root: LIFF init, role routing, home screen
│       ├── pages/
│       │   ├── OrderForm.jsx       ← หน้าสั่งสินค้า (ลูกค้า)
│       │   ├── MerchantDashboard.jsx ← แดชบอร์ดร้านค้า
│       │   ├── RiderDashboard.jsx  ← แดชบอร์ดไรเดอร์ (TODO)
│       │   └── AdminPanel.jsx      ← จัดการสิทธิ์ user (TODO)
│       └── lib/
│           └── supabase.js         ← Supabase client
│
└── 🐍  backend/
    └── main.py                     ← FastAPI: webhook, push notification, LINE Flex
```

---

## 🧩 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS    |
| Auth/Chat | LINE LIFF SDK + Messaging API     |
| Database  | Supabase (PostgreSQL + Realtime)  |
| Backend   | FastAPI (Python) + httpx          |
| Hosting   | (แนะนำ: Vercel frontend, Render/Railway backend) |

---

## 🗄️ Supabase Database Schema

### `users`
```sql
id              uuid PK
line_user_id    text UNIQUE    -- LINE userId
display_name    text
picture_url     text
role            text DEFAULT 'customer'  -- 'customer' | 'merchant' | 'rider' | 'admin'
is_active       bool DEFAULT true
last_seen       timestamptz
created_at      timestamptz
```

### `orders`
```sql
id              uuid PK
user_id         text           -- LINE userId ของลูกค้า
display_name    text
items           text[]
items_detail    jsonb          -- [{id, name, qty, price, emoji}]
total_price     float
subtotal        float
delivery_fee    float
points_used     float
payment_method  text           -- cash | transfer | promptpay
lat             float
lng             float
address         text
note            text
status          text           -- รอร้านยืนยัน | กำลังทำ | รอไรเดอร์รับ | กำลังจัดส่ง | ส่งสำเร็จ | ยกเลิก
rider_id        text NULL      -- LINE userId ของไรเดอร์ที่รับงาน
cancelled_by    text NULL      -- 'customer' | 'merchant' | 'rider'
cancel_reason   text NULL
created_at      timestamptz
updated_at      timestamptz
```

### `menu_items`
```sql
id              uuid PK
name            text
price           float
emoji           text
image_url       text NULL
category        text
description     text
is_available    bool DEFAULT true
is_popular      bool DEFAULT false
sort_order      int
sold_count      int DEFAULT 0
rating          float DEFAULT 4.5
created_at      timestamptz
```

### `user_points`
```sql
user_id         text PK        -- LINE userId
points          int DEFAULT 0
total_earned    int DEFAULT 0
total_spent     int DEFAULT 0
updated_at      timestamptz
```

### `saved_addresses`
```sql
id              uuid PK
user_id         text
address         text
used_count      int DEFAULT 0
lat             float NULL
lng             float NULL
created_at      timestamptz
```

### `flash_deals`
```sql
id              uuid PK
menu_item_id    uuid FK → menu_items
discount_percent int
start_at        timestamptz
end_at          timestamptz
is_active       bool DEFAULT true
created_at      timestamptz
```

### `rider_earnings` (TODO)
```sql
id              uuid PK
rider_id        text           -- LINE userId
order_id        uuid FK
amount          float
earned_at       timestamptz
```

---

## 🌐 Environment Variables

### Frontend (`.env`)
```
VITE_LIFF_ID=your-liff-id
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.railway.app
```

### Backend (`.env`)
```
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
LIFF_ID=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

---

## 🚀 วิธีรัน

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install fastapi uvicorn httpx python-dotenv
uvicorn main:app --reload --port 8000
```

---

## 👥 Role System

| Role       | เข้าถึงได้                                    | ไม่สามารถเข้า                    |
|------------|----------------------------------------------|----------------------------------|
| `customer` | OrderForm (สั่งสินค้า, ติดตาม, โปรไฟล์)     | MerchantDashboard, RiderDashboard, AdminPanel |
| `merchant` | MerchantDashboard (ออเดอร์, เมนู, deal, สถิติ) + OrderForm | RiderDashboard, AdminPanel |
| `rider`    | RiderDashboard (งานที่รับ, นำทาง, ประวัติ)   | MerchantDashboard, AdminPanel    |
| `admin`    | AdminPanel (จัดการสิทธิ์ทุก user) + ทุกอย่าง | —                                |

**Role กำหนดใน `users.role` ใน Supabase**  
Admin assign role ผ่านหน้า AdminPanel ใน LIFF

---

## 📡 API Endpoints (Backend)

| Method | Path                        | ใช้ทำอะไร                          |
|--------|-----------------------------|-------------------------------------|
| GET    | `/`                         | Health check                        |
| GET    | `/health`                   | ตรวจสอบ env vars                    |
| POST   | `/webhook`                  | LINE Webhook events                 |
| POST   | `/orders`                   | รับ notify → ส่ง LINE push ลูกค้า  |
| PATCH  | `/orders/{id}/status`       | อัปเดตสถานะ + push LINE             |
| GET    | `/orders`                   | ดูออเดอร์ทั้งหมด (merchant)        |
| GET    | `/orders/{id}`              | ดูออเดอร์เดียว                      |
| POST   | `/orders/{id}/cancel`       | ยกเลิกออเดอร์ + push LINE (TODO)   |
| POST   | `/notify/merchant`          | push แจ้งร้านค้าเมื่อมี order ใหม่ (TODO) |
| POST   | `/notify/rider`             | push แจ้งไรเดอร์เมื่อ order พร้อมส่ง (TODO) |
| GET    | `/users`                    | ดูรายชื่อ user ทั้งหมด (admin) (TODO) |
| PATCH  | `/users/{id}/role`          | เปลี่ยน role user (admin) (TODO)   |

---

## 🔔 LINE Push Notification Flow

```
ลูกค้าสั่ง → Supabase INSERT
    ↓
Frontend POST /orders (backend)
    ↓
Backend push LINE → ลูกค้า (ยืนยันออเดอร์)
Backend push LINE → ร้านค้าทุก account ที่ role=merchant (TODO)
    ↓
ร้านค้าอัปเดตสถานะ "กำลังทำ"
    ↓
Backend push LINE → ลูกค้า
    ↓
ร้านค้าอัปเดต "รอไรเดอร์รับ"
    ↓
Backend push LINE → ไรเดอร์ทุก account ที่ role=rider (TODO)
    ↓
ไรเดอร์กด "รับงาน" → status = "กำลังจัดส่ง"
    ↓
Backend push LINE → ลูกค้า + ร้านค้า
    ↓
ไรเดอร์กด "ส่งสำเร็จ" → status = "ส่งสำเร็จ"
    ↓
Backend push LINE → ลูกค้า (รับของแล้ว + แต้ม)
```

---

## 📝 หมายเหตุสำคัญ

- **Role-based access**: ตรวจสอบ role จาก `users` table ก่อน render component
- **ยกเลิกออเดอร์**: ทำได้เฉพาะ status `รอร้านยืนยัน` และ `กำลังทำ` เท่านั้น
- **ไรเดอร์รับงาน**: 1 order = 1 rider (first-come-first-served)
- **Supabase RLS**: ควรเปิด Row Level Security ให้ลูกค้าเห็นแค่ order ตัวเอง