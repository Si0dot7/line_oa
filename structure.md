# 🗂️ คู่มือโครงสร้างโค้ด — ไปแก้ที่ไหน?

> อ่านไฟล์นี้ก่อนแก้โค้ดทุกครั้ง เพื่อไปถูกไฟล์ทันที

---

## 📁 โครงสร้างโฟลเดอร์

```
src/
├── pages/              ← หน้าหลัก (orchestration เท่านั้น ไม่มี UI ยาว)
├── hooks/              ← logic / data fetching แยกจาก UI
├── components/
│   ├── merchant/       ← UI ของร้านค้า
│   ├── order/          ← UI ของลูกค้าสั่งอาหาร
│   ├── rider/          ← UI ของไรเดอร์
│   └── shared/         ← UI ที่ใช้ร่วมกันทุก role
└── constants/          ← ค่าคงที่ใช้ร่วมกัน
```

---

## 🔍 ต้องการแก้อะไร → ไปไฟล์ไหน

### 🛍️ ฝั่งลูกค้า (OrderForm)

| อยากแก้อะไร | ไฟล์ |
|---|---|
| **Flow การสั่ง** (state, submit, reorder) | `pages/OrderForm.jsx` |
| **กริดเมนู** (การ์ดอาหาร, ปุ่ม +/−, Flash Deal badge) | `components/order/MenuGrid.jsx` |
| **ขั้นตอนกรอกที่อยู่** (GPS, Payment, Points, ยืนยัน) | `components/order/DeliveryStep.jsx` |
| **ตะกร้าสินค้า** (sheet ที่ pop ขึ้นมา) | `components/order/CartSheet.jsx` |
| **หน้าสั่งสำเร็จ** (หน้าเขียว ✅ หลัง submit) | `components/order/OrderSuccessScreen.jsx` |
| **การ์ดติดตามออเดอร์** (progress bar, สถานะ, สั่งซ้ำ) | `components/order/OrderCard.jsx` |
| **แท็บโปรไฟล์** (แต้ม, ที่อยู่บันทึก, สถิติ) | `components/order/ProfileTab.jsx` |
| **นับถอยหลัง Flash Deal** | `components/order/FlashCountdown.jsx` |
| **ดึงออเดอร์ของลูกค้า** + Realtime | `hooks/useCustomerOrders.js` |
| **ดึงเมนู** + fallback + Realtime | `hooks/useMenu.js` |
| **แต้มสะสม** (อ่าน/อัปเดต points) | `hooks/usePoints.js` |
| **ที่อยู่บันทึก** (save/load saved addresses) | `hooks/useSavedAddresses.js` |
| **Flash Deal ที่ active** (สำหรับลูกค้า) | `hooks/useFlashDeals.js` → `useActiveFlashDeals` |

---

### 🏪 ฝั่งร้านค้า (MerchantDashboard)

| อยากแก้อะไร | ไฟล์ |
|---|---|
| **Flow หลัก** (state, updateStatus, logic CRUD) | `pages/MerchantDashboard.jsx` |
| **รายการออเดอร์** (filter, การ์ดออเดอร์, เปลี่ยนสถานะ) | `components/merchant/OrdersTab.jsx` |
| **จัดการเมนู** (รายการ, ปุ่มแก้/ลบ/toggle) | `components/merchant/MenuTab.jsx` |
| **ฟอร์มเพิ่ม/แก้เมนู** (emoji picker, ฟอร์มกรอก) | `components/merchant/MenuForm.jsx` |
| **รายการ Flash Deal** | `components/merchant/DealsTab.jsx` |
| **ฟอร์มสร้าง Flash Deal** | `components/merchant/DealForm.jsx` |
| **หน้าสถิติ** (KPI, เมนูยอดนิยม, payment breakdown) | `components/merchant/AnalyticsTab.jsx` |
| **ดึงออเดอร์ทั้งหมด** + Realtime | `hooks/useRealtimeOrders.js` |
| **CRUD เมนู** (add/update/delete/toggle) | `hooks/useMenuManagement.js` |
| **Flash Deal ร้านค้า** (add/remove deals) | `hooks/useFlashDeals.js` → `useMerchantFlashDeals` |

---

### 🛵 ฝั่งไรเดอร์ (RiderDashboard)

| อยากแก้อะไร | ไฟล์ |
|---|---|
| **Flow หลัก** (acceptOrder, completeOrder, Realtime) | `pages/RiderDashboard.jsx` |
| **การ์ดงาน** (รับงาน / ส่งสำเร็จ / นำทาง) | `components/rider/OrderCard.jsx` |
| **ประวัติงานวันนี้** | `components/rider/HistoryCard.jsx` |
| **แท็บรายได้** (รายได้วันนี้, สัปดาห์) | `components/rider/EarningsTab.jsx` |

---

### 🔑 Admin Panel

| อยากแก้อะไร | ไฟล์ |
|---|---|
| **ทุกอย่างใน Admin** (ค้นหา, เปลี่ยน role, toggle active) | `pages/Adminpanel.jsx` |

---

### 🔧 Shared / ใช้ทุกที่

| อยากแก้อะไร | ไฟล์ |
|---|---|
| **Toast notification** (ข้อความแจ้งเตือนลอยบนหน้า) | `components/shared/Toast.jsx` |
| **Toggle switch** (on/off ที่ใช้ทุกที่) | `components/shared/Toggle.jsx` |
| **Empty state / Loading spinner** | `components/shared/EmptyState.jsx` |
| **Logic toast** (showToast, timer) | `hooks/useToast.js` |
| **สีสถานะออเดอร์** (STATUS_META, badge, bar color) | `constants/orderStatus.js` |
| **ลำดับสถานะ** (NEXT_STATUS, NEXT_LABEL) | `constants/orderStatus.js` |
| **หมวดหมู่เมนู / Emoji presets** | `constants/menuConstants.js` |
| **เมนู fallback** (ถ้า Supabase ว่าง) | `constants/menuConstants.js` |

---

## 🧭 แผนผัง Data Flow

```
Supabase
  │
  ├── hooks/useRealtimeOrders.js    → MerchantDashboard
  ├── hooks/useCustomerOrders.js    → OrderForm
  ├── hooks/useMenu.js              → OrderForm (MenuGrid)
  ├── hooks/useMenuManagement.js    → MerchantDashboard (MenuTab)
  ├── hooks/useFlashDeals.js        → OrderForm + MerchantDashboard
  ├── hooks/usePoints.js            → OrderForm (DeliveryStep, ProfileTab)
  └── hooks/useSavedAddresses.js   → OrderForm (DeliveryStep, ProfileTab)
```

---

## 💡 หลักการแก้โค้ด

### อยากแก้ **หน้าตา / UI** → ไปที่ `components/`
```
เช่น อยากเปลี่ยนสีปุ่ม "รับงาน"
→ components/rider/OrderCard.jsx
```

### อยากแก้ **logic / เงื่อนไข / calculation** → ไปที่ `pages/` หรือ `hooks/`
```
เช่น อยากเปลี่ยนสูตรคำนวณค่าส่ง
→ pages/OrderForm.jsx  (ส่วน deliveryFee)

เช่น อยากเพิ่ม filter ออเดอร์
→ hooks/useCustomerOrders.js
```

### อยากแก้ **ค่าคงที่** (สี, ป้ายชื่อ, หมวดหมู่) → ไปที่ `constants/`
```
เช่น อยากเปลี่ยนชื่อสถานะ "ส่งสำเร็จ" → "จัดส่งแล้ว"
→ constants/orderStatus.js  (STATUS_META[...].label)

เช่น อยากเพิ่มหมวดเมนูใหม่
→ constants/menuConstants.js  (CATEGORIES)
```

### อยากแก้ **การดึงข้อมูลจาก Supabase** → ไปที่ `hooks/`
```
เช่น อยากดึงออเดอร์มากกว่า 100 รายการ
→ hooks/useRealtimeOrders.js  (เปลี่ยน .limit(100))
```

---

## 🔄 ตัวอย่าง Use Case ที่พบบ่อย

| อยากทำ | ไปแก้ที่ |
|---|---|
| เพิ่มสถานะออเดอร์ใหม่ เช่น "กำลังแพ็ค" | `constants/orderStatus.js` + `components/merchant/OrdersTab.jsx` |
| เปลี่ยนค่าส่งขั้นต่ำ (ปัจจุบัน 150฿ ฟรีส่ง) | `pages/OrderForm.jsx` บรรทัด `deliveryFee` |
| เพิ่มช่องทางชำระเงินใหม่ | `components/order/DeliveryStep.jsx` → array `PAYMENT_METHODS` |
| เปลี่ยน % ส่วนลด Flash Deal ที่เลือกได้ | `components/merchant/DealForm.jsx` → array `DISCOUNT_OPTIONS` |
| เพิ่ม field ในฟอร์มเมนู | `components/merchant/MenuForm.jsx` |
| เปลี่ยนสูตรได้แต้ม (ปัจจุบัน 10฿ = 1 แต้ม) | `pages/MerchantDashboard.jsx` → `updateStatus` + `pages/OrderForm.jsx` → `submit` |
| เพิ่มหมวดหมู่เมนู | `constants/menuConstants.js` → `CATEGORIES` |
| เพิ่ม emoji ให้เลือกในฟอร์มเมนู | `constants/menuConstants.js` → `EMOJI_PRESETS` |
| เปลี่ยนจำนวนออเดอร์ที่โหลด | `hooks/useRealtimeOrders.js` หรือ `hooks/useCustomerOrders.js` → `.limit()` |
| เพิ่มแท็บใหม่ใน MerchantDashboard | `pages/MerchantDashboard.jsx` → array `DASH_TABS` + เพิ่ม component |
| แก้ UI การ์ดออเดอร์ที่ลูกค้าเห็น | `components/order/OrderCard.jsx` |
| แก้ UI การ์ดออเดอร์ที่ไรเดอร์เห็น | `components/rider/OrderCard.jsx` |
| แก้ UI การ์ดออเดอร์ที่ร้านค้าเห็น | `components/merchant/OrdersTab.jsx` → `MerchantOrderCard` |
| เปลี่ยน duration ของ toast notification | `hooks/useToast.js` → parameter `duration` |
| แก้ dev mock profile | `hooks/useLiff.jsx` → `DEV_PROFILE` |