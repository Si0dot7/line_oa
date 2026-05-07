// src/constants/orderStatus.js
// ใช้ร่วมกันระหว่าง OrderForm, MerchantDashboard, RiderDashboard

export const STATUS_OPTIONS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]
export const STATUS_STEPS   = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]

export const STATUS_META = {
  "รอร้านยืนยัน": { color: "text-amber-600",  bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700",   border: "border-amber-200",  bar: "bg-amber-400",  btnBg: "bg-amber-500 hover:bg-amber-600",   icon: "⏳", dot: "bg-amber-400",  label: "รอยืนยัน" },
  "กำลังทำ":      { color: "text-blue-600",    bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",     border: "border-blue-200",   bar: "bg-blue-500",   btnBg: "bg-blue-600 hover:bg-blue-700",     icon: "👨‍🍳", dot: "bg-blue-500",   label: "กำลังทำ"  },
  "กำลังจัดส่ง": { color: "text-purple-600",  bg: "bg-purple-50",  badge: "bg-purple-100 text-purple-700", border: "border-purple-200", bar: "bg-purple-500", btnBg: "bg-purple-600 hover:bg-purple-700", icon: "🛵", dot: "bg-purple-500", label: "จัดส่ง"   },
  "ส่งสำเร็จ":   { color: "text-green-600",   bg: "bg-green-50",   badge: "bg-green-100 text-green-700",   border: "border-green-200",  bar: "bg-green-500",  btnBg: "bg-green-600 hover:bg-green-700",   icon: "✅", dot: "bg-green-500",  label: "สำเร็จ"   },
}

export const NEXT_STATUS = {
  "รอร้านยืนยัน": "กำลังทำ",
  "กำลังทำ":      "กำลังจัดส่ง",
  "กำลังจัดส่ง": "ส่งสำเร็จ",
  "ส่งสำเร็จ":   null,
}

export const NEXT_LABEL = {
  "รอร้านยืนยัน": "✅ ยืนยันออเดอร์",
  "กำลังทำ":      "🛵 ส่งออก",
  "กำลังจัดส่ง": "✅ ส่งสำเร็จ",
}