// src/constants/menuConstants.js
export const CATEGORIES = ["ข้าว", "เส้น", "ยำ/ต้ม", "พิเศษ", "เครื่องดื่ม", "ของหวาน", "อื่นๆ"]

export const EMOJI_PRESETS = [
  "🍗","🍖","🍜","🌶️","🌿","🦐","🫕","🥚",
  "🐟","🍳","🍱","🍛","🥗","🍢","🧆","🥤",
  "🧃","☕","🍰","🧁",
]

export const FALLBACK_MENU = [
  { id: 1, name: "ข้าวมันไก่",      price: 50, emoji: "🍗", description: "ไก่ต้มนุ่ม น้ำซุปหอม",     category: "ข้าว",   is_popular: true,  rating: 4.9, sold_count: 238, is_available: true },
  { id: 2, name: "ข้าวหมูแดง",      price: 55, emoji: "🍖", description: "หมูแดงหวานกลมกล่อม",       category: "ข้าว",   is_popular: false, rating: 4.7, sold_count: 184, is_available: true },
  { id: 3, name: "ผัดไทย",          price: 60, emoji: "🍜", description: "เส้นหนาผัดไฟแรง",          category: "เส้น",   is_popular: true,  rating: 4.8, sold_count: 312, is_available: true },
  { id: 4, name: "ส้มตำ",           price: 45, emoji: "🌶️", description: "เผ็ดหอมมะนาว",            category: "ยำ/ต้ม", is_popular: false, rating: 4.6, sold_count: 97,  is_available: true },
  { id: 5, name: "ข้าวผัดกระเพรา", price: 55, emoji: "🌿", description: "กระเพราหมูสับไข่ดาว",      category: "ข้าว",   is_popular: true,  rating: 4.9, sold_count: 415, is_available: true },
  { id: 6, name: "ต้มยำกุ้ง",      price: 80, emoji: "🦐", description: "ต้มยำน้ำข้นรสจัด",         category: "ยำ/ต้ม", is_popular: false, rating: 4.7, sold_count: 143, is_available: true },
  { id: 7, name: "ราดหน้าหมู",     price: 55, emoji: "🫕", description: "เส้นใหญ่ราดหน้าน้ำข้น",    category: "เส้น",   is_popular: false, rating: 4.5, sold_count: 89,  is_available: true },
  { id: 8, name: "ไข่เจียวหมูสับ", price: 45, emoji: "🥚", description: "ไข่เจียวฟูนุ่ม หมูสับหอม", category: "พิเศษ",  is_popular: false, rating: 4.4, sold_count: 67,  is_available: true },
  { id: 9, name: "ข้าวต้มปลา",     price: 65, emoji: "🐟", description: "ปลากะพงสด ข้าวต้มหอม",    category: "พิเศษ",  is_popular: true,  rating: 4.8, sold_count: 156, is_available: true },
]