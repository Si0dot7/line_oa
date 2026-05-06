# 🗺️ ROADMAP — LINE Delivery

> อัปเดตล่าสุด: พฤษภาคม 2025  
> ใช้ไฟล์นี้เป็น context สำหรับ chat session ใหม่

---

## ✅ สิ่งที่ทำเสร็จแล้ว (Done)

### Frontend
- [x] **App.jsx** — LIFF init, login, บันทึก profile ลง Supabase, home screen เลือกโหมด
- [x] **OrderForm.jsx** — ลูกค้าสั่งสินค้า
  - [x] ดึงเมนูจาก Supabase (+ fallback static)
  - [x] ตะกร้าสินค้า + จำนวน
  - [x] ค้นหาเมนู + filter category
  - [x] Flash Deal countdown
  - [x] GPS location
  - [x] บันทึก/เลือกที่อยู่ที่ใช้บ่อย (`saved_addresses`)
  - [x] Payment method (cash/transfer/promptpay)
  - [x] ใช้แต้มสะสมลดราคา
  - [x] ส่ง order ไป Supabase + notify backend
  - [x] Realtime tracking ออเดอร์ตัวเอง (Supabase channel)
  - [x] Reorder (สั่งซ้ำออเดอร์เก่า)
  - [x] หน้าโปรไฟล์ + แต้มสะสม
- [x] **MerchantDashboard.jsx** — ร้านค้าจัดการ
  - [x] Realtime orders (Supabase channel)
  - [x] Filter/view orders by status
  - [x] อัปเดต status ออเดอร์ (ขั้นตอน: รอยืนยัน→ทำ→จัดส่ง→สำเร็จ)
  - [x] เปลี่ยน status แบบ manual (expand panel)
  - [x] เปิด Google Maps นำทางไปหาลูกค้า
  - [x] CRUD เมนู (เพิ่ม/แก้ไข/ลบ/toggle available)
  - [x] Flash Deal (สร้าง/ปิด)
  - [x] Analytics tab (รายได้วันนี้, top menu, payment breakdown)
  - [x] Push LINE แจ้งลูกค้าเมื่ออัปเดตสถานะ

### Backend (main.py)
- [x] FastAPI app + CORS
- [x] LINE Webhook (follow event, text commands, quick reply)
- [x] Rich Menu สร้างอัตโนมัติตอน startup
- [x] `push_message()` / `reply_message()` helpers
- [x] Flex Message builders: order confirmed, status update, order button
- [x] `POST /orders` — รับ notify จาก frontend → push LINE ลูกค้า
- [x] `PATCH /orders/{id}/status` — อัปเดต Supabase + push LINE ลูกค้า
- [x] `GET /orders`, `GET /orders/{id}` — ดูออเดอร์
- [x] Supabase REST helpers (`sb_get`, `sb_patch`)

---

## 🔨 กำลังพัฒนา / TODO ถัดไป

### 🔐 Priority 1: Role System & Access Control
> **สำคัญที่สุด — ต้องทำก่อน feature อื่น**

#### 1.1 Supabase: เพิ่ม column `role` ใน `users` table
```sql
ALTER TABLE users ADD COLUMN role text DEFAULT 'customer';
ALTER TABLE users ADD COLUMN is_active bool DEFAULT true;
-- role: 'customer' | 'merchant' | 'rider' | 'admin'
```

#### 1.2 Frontend: `useRole` hook (อ่าน role จาก Supabase)
- สร้างไฟล์ `src/hooks/useRole.js`
- อ่าน `users` table ด้วย `line_user_id` หลัง LIFF init
- Return: `{ role, loading, isCustomer, isMerchant, isRider, isAdmin }`

#### 1.3 App.jsx: Gate ตาม role
- ถ้า role = `customer` → ซ่อนปุ่ม "หน้าร้านค้า" ออก
- ถ้า role = `merchant` หรือ `admin` → เห็นปุ่ม "หน้าร้านค้า"
- ถ้า role = `rider` หรือ `admin` → เห็นปุ่ม "หน้าไรเดอร์"
- ถ้าพยายามเข้า URL โดยตรง (`?mode=merchant`) แล้ว role ไม่ match → redirect

#### 1.4 สร้าง `AdminPanel.jsx` (หน้าจัดการสิทธิ์)
```
หน้านี้ accessible เฉพาะ role=admin เท่านั้น (?mode=admin)

Features:
- ดูรายชื่อ user ทั้งหมดที่เคย follow OA
- ค้นหาด้วย displayName หรือ userId
- เปลี่ยน role user (dropdown: customer/merchant/rider)
- ปิด/เปิด account (is_active toggle)
- แสดง: รูปโปรไฟล์, ชื่อ, role ปัจจุบัน, last_seen
```

#### 1.5 Backend: เพิ่ม endpoint จัดการ user
```python
GET  /users              # ดูรายชื่อทั้งหมด (admin only)
PATCH /users/{user_id}/role  # เปลี่ยน role
```

---

### ❌ Priority 2: ยกเลิกออเดอร์ (Cancel Order)

#### 2.1 Supabase: เพิ่ม columns
```sql
ALTER TABLE orders ADD COLUMN cancelled_by text;   -- 'customer'|'merchant'|'rider'
ALTER TABLE orders ADD COLUMN cancel_reason text;
```

#### 2.2 MerchantDashboard.jsx: ปุ่มยกเลิก
- เพิ่มปุ่ม "❌ ยกเลิกออเดอร์" ใน order card
- ยกเลิกได้เฉพาะ status: `รอร้านยืนยัน` และ `กำลังทำ`
- เปิด modal ให้เลือกเหตุผล: (ของหมด / ร้านปิด / ลูกค้าขอยกเลิก / อื่นๆ)
- อัปเดต Supabase: `status='ยกเลิก'`, `cancelled_by='merchant'`, `cancel_reason=...`
- เรียก backend → push LINE แจ้งลูกค้า

#### 2.3 OrderForm.jsx: ลูกค้ายกเลิกได้ด้วย
- เพิ่มปุ่ม "ยกเลิกออเดอร์" ใน OrderCard (เฉพาะ status `รอร้านยืนยัน`)
- อัปเดต `cancelled_by='customer'`

#### 2.4 Backend: Flex Message สำหรับการยกเลิก
```python
def make_cancel_flex(order_id, reason, cancelled_by):
    # แจ้งลูกค้าว่าออเดอร์ถูกยกเลิก + เหตุผล
    # แจ้งร้านค้าถ้าลูกค้าเป็นคนยกเลิก
```

---

### 🛵 Priority 3: RiderDashboard (ใหม่ทั้งหมด)

> สร้างไฟล์ใหม่: `src/pages/RiderDashboard.jsx`

#### Tabs:
1. **งานใหม่** — ออเดอร์ที่ status = `รอไรเดอร์รับ`
   - แสดง: ระยะทาง, ที่อยู่ลูกค้า, ยอดออเดอร์
   - ปุ่ม: "🛵 รับงานนี้" → อัปเดต `rider_id`, status = `กำลังจัดส่ง`
   - Realtime: auto refresh เมื่อมีงานใหม่

2. **งานของฉัน** — ออเดอร์ที่ `rider_id = ฉัน` และ status = `กำลังจัดส่ง`
   - ปุ่ม: "🗺️ นำทาง" → เปิด Google Maps
   - ปุ่ม: "✅ ส่งสำเร็จ" → อัปเดต status, คำนวณรายได้

3. **ประวัติ** — งานที่ส่งสำเร็จแล้ว + รายได้สะสม

#### Backend changes:
- `status` flow ใหม่: `กำลังทำ` → **`รอไรเดอร์รับ`** → `กำลังจัดส่ง` → `ส่งสำเร็จ`
- เมื่อร้านกด "ส่งออก" → status = `รอไรเดอร์รับ` → push LINE ทุก rider ที่ active
- `rider_earnings` table: บันทึกรายได้แต่ละ delivery

---

### 🔔 Priority 4: Push Notification ร้านค้าและไรเดอร์

#### 4.1 แจ้งร้านค้าเมื่อมี order ใหม่
```python
# main.py
async def notify_merchants(order: dict):
    # ดึง user ทั้งหมดที่ role='merchant' จาก Supabase
    merchants = await sb_get("users", {"role": "eq.merchant", "is_active": "eq.true"})
    for m in merchants:
        await push_message(m["line_user_id"], [make_new_order_flex(order)])
```

#### 4.2 แจ้งไรเดอร์เมื่อมีงาน
```python
async def notify_riders(order: dict):
    riders = await sb_get("users", {"role": "eq.rider", "is_active": "eq.true"})
    for r in riders:
        await push_message(r["line_user_id"], [make_pickup_request_flex(order)])
```

#### 4.3 Flex Messages ใหม่ที่ต้องสร้าง
- `make_new_order_flex()` — แจ้งร้านค้า: order ใหม่, รายการ, ลูกค้า
- `make_pickup_request_flex()` — แจ้งไรเดอร์: รับงาน, ที่อยู่ร้าน/ลูกค้า
- `make_cancel_flex()` — แจ้งยกเลิก (ลูกค้า/ร้านค้า/ไรเดอร์)
- `make_rider_assigned_flex()` — แจ้งลูกค้า: ไรเดอร์รับงานแล้ว (แสดงชื่อไรเดอร์)

---

### 📊 Priority 5: Feature เพิ่มเติม (Nice to have)

- [ ] **Rating system** — ลูกค้ารีวิวหลังส่งสำเร็จ (1-5 ดาว, comment)
- [ ] **LINE Webhook: check role** — พิมพ์ "ร้านค้า" แต่ role=customer → ตอบว่าไม่มีสิทธิ์
- [ ] **Supabase RLS** — ลูกค้าเห็นแค่ order ตัวเอง, ไรเดอร์เห็นแค่งานตัวเอง
- [ ] **Push notification แบบ batch** — ใช้ LINE Multicast แทน push ทีละคน
- [ ] **ร้านค้า: ปิด-เปิดร้าน** — toggle สถานะร้านไม่รับออเดอร์ชั่วคราว
- [ ] **ไรเดอร์: แสดงตำแหน่ง real-time** — share location จาก LINE

---

## 🔄 Status Flow (ใหม่หลังเพิ่ม Rider)

```
[ลูกค้าสั่ง]
      ↓
รอร้านยืนยัน  ──(ร้านค้ากด "ยืนยัน")──→  กำลังทำ
      │                                        │
      └──(ยกเลิก: ร้าน/ลูกค้า)──→  ยกเลิก   │
                                               │
                              (ร้านค้ากด "ส่งออก")
                                               ↓
                                      รอไรเดอร์รับ  ──(ยกเลิก: ร้าน)──→  ยกเลิก
                                               │
                              (ไรเดอร์กด "รับงาน")
                                               ↓
                                        กำลังจัดส่ง
                                               │
                              (ไรเดอร์กด "ส่งสำเร็จ")
                                               ↓
                                          ส่งสำเร็จ ✅
```

---

## 📋 Context สำหรับ Chat ใหม่

> **Copy section นี้ไปวาง** เมื่อเริ่ม session ใหม่

```
Project: LINE Delivery — ระบบสั่งอาหาร LINE LIFF
Stack: React + Vite + Tailwind / FastAPI / Supabase / LINE API

ไฟล์ที่มีอยู่:
- App.jsx: LIFF init, home screen, routing ด้วย ?mode=
- OrderForm.jsx: ลูกค้าสั่งสินค้า (ครบฟีเจอร์)
- MerchantDashboard.jsx: ร้านค้าจัดการออเดอร์/เมนู/deals
- main.py: FastAPI backend, LINE webhook, push notification
- supabase.js: Supabase client

สิ่งที่ต้องทำต่อ (ตามลำดับ):
1. Role System: เพิ่ม role column ใน users table,
   สร้าง useRole hook, gate access ใน App.jsx,
   สร้าง AdminPanel.jsx สำหรับจัดการสิทธิ์
2. Cancel Order: ร้านค้ายกเลิกได้ใน MerchantDashboard,
   ลูกค้ายกเลิกได้ใน OrderForm (status รอร้านยืนยัน เท่านั้น)
3. RiderDashboard.jsx: ไรเดอร์รับงาน/นำทาง/ส่งสำเร็จ
4. Push notification: แจ้งร้านค้าเมื่อมีออเดอร์,
   แจ้งไรเดอร์เมื่องานพร้อมส่ง

Status flow ใหม่:
รอร้านยืนยัน → กำลังทำ → รอไรเดอร์รับ → กำลังจัดส่ง → ส่งสำเร็จ
(ยกเลิกได้: รอร้านยืนยัน, กำลังทำ)
```

---

## ⚠️ จุดที่ต้องระวัง

1. **LIFF_ID** ต้องตั้งค่าถูกต้อง ไม่งั้นจะใช้ dev mode (userId = `dev-user-001`)
2. **Supabase service key** ใช้ฝั่ง backend เท่านั้น ห้ามเปิดเผยใน frontend
3. **LINE push** ใช้ `push_message` ไม่ใช่ `reply_message` เมื่อต้องการส่งหา user โดยตรง
4. **Cancel order** ต้องอัปเดต `updated_at` ทุกครั้งที่ status เปลี่ยน
5. **Role check** ต้องทำทั้ง frontend (ซ่อน UI) และ backend (validate API call)