// src/pages/OrderForm.jsx
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_STEPS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]
const STATUS_META = {
  "รอร้านยืนยัน": { color: "text-amber-500",  bg: "bg-amber-50",   bar: "bg-amber-400",   icon: "⏳", badge: "bg-amber-100 text-amber-600",  label: "รอยืนยัน" },
  "กำลังทำ":      { color: "text-blue-500",    bg: "bg-blue-50",    bar: "bg-blue-400",    icon: "👨‍🍳", badge: "bg-blue-100 text-blue-600",    label: "กำลังทำ"  },
  "กำลังจัดส่ง": { color: "text-purple-500",  bg: "bg-purple-50",  bar: "bg-purple-400",  icon: "🛵", badge: "bg-purple-100 text-purple-600", label: "จัดส่ง"   },
  "ส่งสำเร็จ":   { color: "text-green-500",   bg: "bg-green-50",   bar: "bg-green-400",   icon: "✅", badge: "bg-green-100 text-green-600",   label: "สำเร็จ"   },
}

// ── Supabase Realtime hook ──────────────────────────────────────────
function useRealtimeOrders(userId) {
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)
    if (data) setMyOrders(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
    const ch = supabase.channel("orders-user-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT") setMyOrders(p => [payload.new, ...p])
          else if (payload.eventType === "UPDATE") setMyOrders(p => p.map(o => o.id === payload.new.id ? payload.new : o))
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, fetch])

  return { myOrders, loading, refetch: fetch }
}

// ── Supabase Menu hook ──────────────────────────────────────────────
function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState(["ทั้งหมด"])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true })
      if (data && data.length > 0) {
        setMenuItems(data)
        const cats = ["ทั้งหมด", ...new Set(data.map(i => i.category).filter(Boolean))]
        setCategories(cats)
      } else {
        // Fallback static menu
        const fallback = [
          { id: 1, name: "ข้าวมันไก่",       price: 50,  emoji: "🍗", description: "ไก่ต้มนุ่ม น้ำซุปหอม",      category: "ข้าว",   is_popular: true,  rating: 4.9, sold_count: 238, is_available: true },
          { id: 2, name: "ข้าวหมูแดง",       price: 55,  emoji: "🍖", description: "หมูแดงหวานกลมกล่อม",        category: "ข้าว",   is_popular: false, rating: 4.7, sold_count: 184, is_available: true },
          { id: 3, name: "ผัดไทย",           price: 60,  emoji: "🍜", description: "เส้นหนาผัดไฟแรง",           category: "เส้น",   is_popular: true,  rating: 4.8, sold_count: 312, is_available: true },
          { id: 4, name: "ส้มตำ",            price: 45,  emoji: "🌶️", description: "เผ็ดหอมมะนาว",             category: "ยำ/ต้ม", is_popular: false, rating: 4.6, sold_count: 97,  is_available: true },
          { id: 5, name: "ข้าวผัดกระเพรา",  price: 55,  emoji: "🌿", description: "กระเพราหมูสับไข่ดาว",       category: "ข้าว",   is_popular: true,  rating: 4.9, sold_count: 415, is_available: true },
          { id: 6, name: "ต้มยำกุ้ง",       price: 80,  emoji: "🦐", description: "ต้มยำน้ำข้นรสจัด",          category: "ยำ/ต้ม", is_popular: false, rating: 4.7, sold_count: 143, is_available: true },
          { id: 7, name: "ราดหน้าหมู",      price: 55,  emoji: "🫕", description: "เส้นใหญ่ราดหน้าน้ำข้น",     category: "เส้น",   is_popular: false, rating: 4.5, sold_count: 89,  is_available: true },
          { id: 8, name: "ไข่เจียวหมูสับ",  price: 45,  emoji: "🥚", description: "ไข่เจียวฟูนุ่ม หมูสับหอม",  category: "พิเศษ",  is_popular: false, rating: 4.4, sold_count: 67,  is_available: true },
          { id: 9, name: "ข้าวต้มปลา",      price: 65,  emoji: "🐟", description: "ปลากะพงสด ข้าวต้มหอม",     category: "พิเศษ",  is_popular: true,  rating: 4.8, sold_count: 156, is_available: true },
        ]
        setMenuItems(fallback)
        setCategories(["ทั้งหมด", "ข้าว", "เส้น", "ยำ/ต้ม", "พิเศษ"])
      }
      setLoading(false)
    }
    fetchMenu()

    // Realtime menu updates
    const ch = supabase.channel("menu-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, fetchMenu)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  return { menuItems, categories, loading }
}

// ── Points / Loyalty hook ───────────────────────────────────────────
function usePoints(userId) {
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!userId) return
    supabase.from("user_points").select("points").eq("user_id", userId).single()
      .then(({ data }) => data && setPoints(data.points))
  }, [userId])

  return { points }
}

// ── Flash Deals hook ────────────────────────────────────────────────
function useFlashDeals() {
  const [deals, setDeals] = useState([])

  useEffect(() => {
    const fetchDeals = async () => {
      const now = new Date().toISOString()
      const { data } = await supabase.from("flash_deals")
        .select("*, menu_items(*)")
        .lte("start_at", now)
        .gte("end_at", now)
        .eq("is_active", true)
      if (data) setDeals(data)
    }
    fetchDeals()
    const interval = setInterval(fetchDeals, 60000)
    return () => clearInterval(interval)
  }, [])

  return { deals }
}

// ─────────────────────────────────────────────────────────────────────
export default function OrderForm({ profile, liff }) {
  const [quantities, setQuantities]         = useState({})
  const [address, setAddress]               = useState("")
  const [note, setNote]                     = useState("")
  const [location, setLocation]             = useState(null)
  const [locLoading, setLocLoading]         = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [tab, setTab]                       = useState("order")       // order | tracking | profile
  const [category, setCategory]             = useState("ทั้งหมด")
  const [search, setSearch]                 = useState("")
  const [savedAddresses, setSavedAddresses] = useState([])
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [toast, setToast]                   = useState(null)
  const [cartOpen, setCartOpen]             = useState(false)
  const [addedAnim, setAddedAnim]           = useState(null)          // item id that just bounced
  const [usePointsRedemption, setUsePointsRedemption] = useState(false)
  const [paymentMethod, setPaymentMethod]   = useState("cash")        // cash | transfer | promptpay
  const [orderStep, setOrderStep]           = useState("menu")        // menu | delivery | confirm

  const toastTimer = useRef(null)
  const searchRef  = useRef(null)

  const { menuItems, categories, loading: menuLoading } = useMenu()
  const { myOrders, loading: ordersLoading, refetch: refetchOrders } = useRealtimeOrders(profile?.userId)
  const { points } = usePoints(profile?.userId)
  const { deals }  = useFlashDeals()

  // ── Saved Addresses ─────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.userId) return
    supabase.from("saved_addresses").select("*").eq("user_id", profile.userId)
      .order("used_count", { ascending: false }).limit(5)
      .then(({ data }) => data && setSavedAddresses(data))
  }, [profile?.userId])

  // ── Realtime order status toast ─────────────────────────────────
  useEffect(() => {
    if (!myOrders.length) return
    // toast handled by realtime hook
  }, [myOrders])

  const showToast = (msg, type = "info") => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  // ── Cart helpers ─────────────────────────────────────────────────
  const setQty = (id, delta) => {
    setQuantities(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      if (delta > 0) {
        setAddedAnim(id)
        setTimeout(() => setAddedAnim(null), 400)
      }
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
  }

  const selectedItems  = menuItems.filter(i => (quantities[i.id] || 0) > 0)
  const itemCount      = selectedItems.reduce((s, i) => s + quantities[i.id], 0)
  const subtotal       = selectedItems.reduce((s, i) => s + i.price * quantities[i.id], 0)
  const deliveryFee    = subtotal >= 150 ? 0 : 25
  const pointsDiscount = usePointsRedemption ? Math.min(points, Math.floor(subtotal * 0.1)) : 0
  const total          = subtotal + deliveryFee - pointsDiscount

  const filteredMenu = menuItems.filter(i => {
    const matchCat  = category === "ทั้งหมด" || i.category === category
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
      || (i.description || "").toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // ── GPS ──────────────────────────────────────────────────────────
  const getLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false) },
      () => { showToast("❌ ไม่สามารถดึง GPS ได้", "error"); setLocLoading(false) }
    )
  }

  // ── Save address ─────────────────────────────────────────────────
  const saveAddress = async addr => {
    if (!addr || !profile?.userId) return
    const existing = savedAddresses.find(a => a.address === addr)
    if (existing) {
      await supabase.from("saved_addresses").update({ used_count: existing.used_count + 1 }).eq("id", existing.id)
    } else {
      await supabase.from("saved_addresses").insert({ user_id: profile.userId, address: addr, used_count: 1 })
    }
    supabase.from("saved_addresses").select("*").eq("user_id", profile.userId)
      .order("used_count", { ascending: false }).limit(5)
      .then(({ data }) => data && setSavedAddresses(data))
  }

  // ── Reorder ──────────────────────────────────────────────────────
  const reorder = async (order) => {
    if (!order.items_detail) return
    const newQty = {}
    for (const item of order.items_detail) {
      const menuItem = menuItems.find(m => m.id === item.id)
      if (menuItem && menuItem.is_available) newQty[item.id] = item.qty
    }
    setQuantities(newQty)
    setAddress(order.address || "")
    setNote(order.note || "")
    setTab("order")
    setOrderStep("menu")
    showToast("🔄 เพิ่มสินค้าเดิมในตะกร้าแล้ว!", "success")
  }

  // ── Submit ───────────────────────────────────────────────────────
  const submit = async () => {
    if (!selectedItems.length) return showToast("❌ กรุณาเลือกสินค้า", "error")
    if (!address.trim())       return showToast("❌ กรุณาใส่ที่อยู่จัดส่ง", "error")
    if (!location)             return showToast("❌ กรุณาดึงตำแหน่ง GPS ก่อน", "error")

    setSubmitting(true)
    try {
      const itemNames   = selectedItems.flatMap(i => Array(quantities[i.id]).fill(i.name))
      const itemsDetail = selectedItems.map(i => ({ id: i.id, name: i.name, qty: quantities[i.id], price: i.price, emoji: i.emoji }))

      const { data: inserted, error: dbErr } = await supabase.from("orders").insert({
        user_id:       profile?.userId || "guest",
        display_name:  profile?.displayName || "ลูกค้า",
        items:         itemNames,
        items_detail:  itemsDetail,
        total_price:   total,
        subtotal,
        delivery_fee:  deliveryFee,
        points_used:   pointsDiscount,
        payment_method: paymentMethod,
        lat:           location.lat,
        lng:           location.lng,
        address:       address.trim(),
        note:          note.trim(),
        status:        "รอร้านยืนยัน",
      }).select().single()

      if (dbErr) throw new Error(dbErr.message)

      // อัปเดต points
      if (pointsDiscount > 0) {
        await supabase.from("user_points").upsert({
          user_id: profile.userId,
          points: points - pointsDiscount,
        }, { onConflict: "user_id" })
      }

      // แจ้ง Backend (LINE push + notify)
      await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id:    inserted.id,
          user_id:     profile?.userId || "guest",
          items:       itemNames,
          lat:         location.lat,
          lng:         location.lng,
          address:     address.trim(),
          note:        note.trim(),
          total_price: total,
          payment_method: paymentMethod,
        }),
      }).catch(() => {}) // backend optional

      await saveAddress(address.trim())
      setCompletedOrder({ ...inserted, order_id: inserted.id })
      setQuantities({})
      setAddress("")
      setNote("")
      setLocation(null)
      setOrderStep("menu")
      setUsePointsRedemption(false)
      refetchOrders()
    } catch (e) {
      showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error")
    }
    setSubmitting(false)
  }

  // ── Render: Success ──────────────────────────────────────────────
  if (completedOrder) {
    const shortId = completedOrder.id?.toString().slice(-6).toUpperCase()
    const earnedPoints = Math.floor(subtotal / 10)
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Success Animation */}
          <div className="bg-gradient-to-br from-green-400 to-green-600 py-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg mb-3 animate-bounce">✅</div>
            <p className="text-white font-black text-2xl">ส่งออเดอร์แล้ว!</p>
            <p className="text-green-100 text-sm mt-1">ร้านค้าจะยืนยันในไม่ช้า</p>
          </div>

          <div className="p-5">
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 text-sm">เลขออเดอร์</span>
                <span className="font-black text-lg text-gray-800 font-mono">#{shortId}</span>
              </div>
              <div className="space-y-1.5 mb-3">
                {completedOrder.items_detail?.map(i => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{i.emoji} {i.name} ×{i.qty}</span>
                    <span className="font-semibold text-gray-800">{i.price * i.qty}฿</span>
                  </div>
                ))}
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-500 border-t border-dashed pt-2 mb-1">
                  <span>ค่าจัดส่ง</span><span>{deliveryFee}฿</span>
                </div>
              )}
              {deliveryFee === 0 && (
                <div className="flex justify-between text-sm text-green-500 border-t border-dashed pt-2 mb-1">
                  <span>🎁 ฟรีค่าส่ง</span><span>0฿</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>รวม</span><span className="text-blue-600">{total}฿</span>
              </div>
            </div>

            {/* Earned points */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-amber-700 font-bold text-sm">ได้รับ {earnedPoints} แต้ม!</p>
                <p className="text-amber-500 text-xs">ใช้แต้มแลกส่วนลดครั้งต่อไป</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setCompletedOrder(null); setTab("tracking") }}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-200">
                📦 ติดตามออเดอร์
              </button>
              <button onClick={() => { setCompletedOrder(null); setTab("order") }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95 transition-all">
                🛍️ สั่งอีก
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeOrderCount = myOrders.filter(o => o.status !== "ส่งสำเร็จ").length

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl
          transition-all duration-300
          ${toast.type === "error" ? "bg-red-500" : toast.type === "success" ? "bg-green-500" : "bg-gray-800"}`}
          style={{ maxWidth: "90vw", textAlign: "center" }}>
          {toast.msg}
        </div>
      )}

      {/* ── Address Picker Sheet ── */}
      {showAddressPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={() => setShowAddressPicker(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-gray-800 text-base mb-3">ที่อยู่ที่บันทึกไว้</h3>
            {savedAddresses.map((a, i) => (
              <button key={i} onClick={() => { setAddress(a.address); setShowAddressPicker(false) }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-3 mb-1">
                <span className="text-xl">📍</span>
                <div>
                  <p className="text-gray-700 text-sm font-medium">{a.address}</p>
                  <p className="text-gray-400 text-xs">ใช้ {a.used_count} ครั้ง</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Cart Sheet ── */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={() => setCartOpen(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 pb-10 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">ตะกร้า ({itemCount} รายการ)</h3>
              <button onClick={() => setQuantities({})} className="text-red-400 text-sm font-semibold">ล้างทั้งหมด</button>
            </div>
            {selectedItems.length === 0
              ? <p className="text-gray-400 text-center py-10">ตะกร้าว่างเปล่า</p>
              : selectedItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                    <p className="text-blue-500 text-sm font-bold">{item.price * quantities[item.id]}฿</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
                    <button onClick={() => setQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">−</button>
                    <span className="w-5 text-center text-sm font-bold">{quantities[item.id]}</span>
                    <button onClick={() => setQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-blue-600 font-bold">+</button>
                  </div>
                </div>
              ))
            }
            {selectedItems.length > 0 && (
              <button onClick={() => { setCartOpen(false); setOrderStep("delivery") }}
                className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all">
                ดำเนินการสั่งซื้อ · {total}฿
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ORDER TAB
      ════════════════════════════════════════════════════════════ */}
      {tab === "order" && orderStep === "menu" && (
        <div>
          {/* Flash Deals Banner */}
          {deals.length > 0 && (
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 flex items-center gap-3">
              <div className="text-2xl animate-pulse">⚡</div>
              <div className="flex-1">
                <p className="text-white font-black text-sm">Flash Deal วันนี้เท่านั้น!</p>
                <p className="text-red-100 text-xs">{deals[0].menu_items?.name} ลด {deals[0].discount_percent}%</p>
              </div>
              <div className="bg-white bg-opacity-20 text-white text-xs font-bold px-2 py-1 rounded-lg">
                <FlashCountdown endAt={deals[0].end_at} />
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาเมนู..."
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300
                           focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm font-[inherit]" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">×</button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex overflow-x-auto no-scrollbar px-4 py-2 gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150
                  ${category === cat ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-gray-500 border border-gray-200"}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          {menuLoading
            ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            : (
              <div className="px-4 pb-4">
                {filteredMenu.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="font-medium">ไม่พบเมนูที่ค้นหา</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {filteredMenu.map(item => {
                    const qty = quantities[item.id] || 0
                    const isAdded = addedAnim === item.id
                    const deal = deals.find(d => d.menu_item_id === item.id)
                    const finalPrice = deal ? Math.round(item.price * (1 - deal.discount_percent / 100)) : item.price

                    return (
                      <div key={item.id}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-150
                          ${qty > 0 ? "border-blue-200 shadow-blue-100" : "border-gray-100"}
                          ${isAdded ? "scale-95" : "scale-100"}`}>

                        {/* Item Image / Emoji */}
                        <div className={`relative h-24 flex items-center justify-center text-5xl
                          ${qty > 0 ? "bg-blue-50" : "bg-gray-50"}`}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover absolute inset-0" />
                            : <span className={`transition-transform duration-200 ${isAdded ? "scale-125" : ""}`}>{item.emoji || "🍽️"}</span>
                          }
                          {item.is_popular && <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">ยอดนิยม</span>}
                          {deal && <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{deal.discount_percent}%</span>}
                          {qty > 0 && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md">
                              {qty}
                            </div>
                          )}
                        </div>

                        <div className="p-2.5">
                          <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{item.description}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-400 text-[10px]">★</span>
                            <span className="text-gray-400 text-[10px]">{item.rating?.toFixed(1)} · {item.sold_count}ครั้ง</span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <span className="font-black text-blue-600 text-sm">{finalPrice}฿</span>
                              {deal && <span className="text-gray-300 text-[10px] line-through ml-1">{item.price}฿</span>}
                            </div>
                            {qty === 0 ? (
                              <button onClick={() => setQty(item.id, 1)}
                                className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm active:scale-90 transition-all">
                                +
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setQty(item.id, -1)} className="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-bold active:scale-90">−</button>
                                <span className="w-5 text-center text-sm font-black text-blue-600">{qty}</span>
                                <button onClick={() => setQty(item.id, 1)} className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold active:scale-90">+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          DELIVERY STEP
      ════════════════════════════════════════════════════════════ */}
      {tab === "order" && orderStep === "delivery" && (
        <div className="px-4 pt-5">
          <button onClick={() => setOrderStep("menu")} className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold mb-5">
            ‹ กลับไปเมนู
          </button>
          <h2 className="font-black text-gray-800 text-lg mb-4">📍 ที่อยู่จัดส่ง</h2>

          {/* Saved address quick picks */}
          {savedAddresses.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">ที่อยู่ที่ใช้บ่อย</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {savedAddresses.map((a, i) => (
                  <button key={i} onClick={() => setAddress(a.address)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border transition-all
                      ${address === a.address ? "border-blue-500 bg-blue-50 text-blue-600 font-bold" : "border-gray-200 bg-white text-gray-600"}`}>
                    📍 {a.address.length > 20 ? a.address.slice(0, 20) + "..." : a.address}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Address input */}
          <div className="relative mb-3">
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
              placeholder="ระบุที่อยู่จัดส่ง เช่น บ้านเลขที่, ซอย, ถนน, แขวง..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300
                         focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-[inherit]" />
          </div>

          {/* GPS */}
          <button onClick={getLocation} disabled={locLoading}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-3 border-2
              ${location ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 border-blue-200"}
              ${locLoading ? "opacity-60" : "active:scale-95"}`}>
            {locLoading
              ? <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> กำลังดึง GPS...</>
              : location
              ? <>✅ GPS พร้อม · {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · แตะเพื่ออัปเดต</>
              : <>📡 ดึงตำแหน่ง GPS (จำเป็น)</>
            }
          </button>

          {/* Note */}
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="💬 หมายเหตุ เช่น ไม่ใส่ผักชี, ฝากไว้หน้าบ้าน"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300
                       focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-4 font-[inherit]" />

          {/* Payment Method */}
          <p className="text-gray-700 font-bold text-sm mb-2">💳 วิธีชำระเงิน</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { id: "cash",      icon: "💵", label: "เงินสด"   },
              { id: "transfer",  icon: "🏦", label: "โอนเงิน"  },
              { id: "promptpay", icon: "📱", label: "PromptPay" },
            ].map(m => (
              <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                className={`py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1
                  ${paymentMethod === m.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500"}`}>
                <span className="text-xl">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* Points */}
          {points > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="font-bold text-amber-700 text-sm">แต้มสะสม {points} แต้ม</p>
                  <p className="text-amber-500 text-xs">ใช้ได้สูงสุด {Math.floor(subtotal * 0.1)}฿</p>
                </div>
              </div>
              <button onClick={() => setUsePointsRedemption(!usePointsRedemption)}
                className={`w-12 h-6 rounded-full transition-all relative ${usePointsRedemption ? "bg-amber-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${usePointsRedemption ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-5">
            <p className="font-bold text-blue-700 text-sm mb-3">🧾 สรุปออเดอร์</p>
            {selectedItems.map(i => (
              <div key={i.id} className="flex justify-between text-sm text-gray-600 py-1">
                <span>{i.emoji} {i.name} ×{quantities[i.id]}</span>
                <span className="font-semibold">{i.price * quantities[i.id]}฿</span>
              </div>
            ))}
            <div className="border-t border-dashed border-blue-200 mt-2 pt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500"><span>ค่าอาหาร</span><span>{subtotal}฿</span></div>
              <div className={`flex justify-between text-xs ${deliveryFee === 0 ? "text-green-500" : "text-gray-500"}`}>
                <span>ค่าจัดส่ง {deliveryFee === 0 ? "🎁 ฟรี!" : ""}</span><span>{deliveryFee}฿</span>
              </div>
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-xs text-amber-500"><span>⭐ ใช้แต้ม</span><span>-{pointsDiscount}฿</span></div>
              )}
              <div className="flex justify-between font-black text-base text-gray-800 pt-1 border-t border-blue-200">
                <span>รวมทั้งหมด</span><span className="text-blue-600">{total}฿</span>
              </div>
            </div>
          </div>

          <button onClick={submit} disabled={submitting}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200
              ${!submitting ? "bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95" : "bg-blue-400 text-white"}`}>
            {submitting
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังส่งออเดอร์...
                </span>
              : `🛍️ ยืนยันสั่งซื้อ · ${total}฿`
            }
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TRACKING TAB
      ════════════════════════════════════════════════════════════ */}
      {tab === "tracking" && (
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-800 font-bold text-base">ออเดอร์ของฉัน</h2>
            <button onClick={refetchOrders}
              className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              🔄 รีเฟรช
            </button>
          </div>

          {ordersLoading
            ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            : myOrders.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-400 mb-5">ยังไม่มีออเดอร์</p>
                <button onClick={() => setTab("order")}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95">
                  สั่งสินค้าเลย
                </button>
              </div>
            )
            : (
              <div className="flex flex-col gap-3">
                {myOrders.map(order => (
                  <OrderCard key={order.id} order={order} onReorder={() => reorder(order)} />
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          PROFILE TAB
      ════════════════════════════════════════════════════════════ */}
      {tab === "profile" && (
        <div className="px-4 pt-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 mb-5 flex items-center gap-4">
            {profile?.pictureUrl
              ? <img src={profile.pictureUrl} alt="" className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover" />
              : <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 font-black text-2xl">{profile?.displayName?.[0]}</div>
            }
            <div>
              <p className="text-white font-black text-lg">{profile?.displayName}</p>
              <p className="text-blue-200 text-sm">{profile?.userId?.slice(0, 16)}...</p>
            </div>
          </div>

          {/* Points card */}
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 mb-4 text-white">
            <p className="text-amber-100 text-sm font-medium mb-1">แต้มสะสม</p>
            <p className="text-white font-black text-4xl">{points} <span className="text-xl">แต้ม</span></p>
            <p className="text-amber-100 text-xs mt-1">= {Math.floor(points / 10)} ฿ ส่วนลด · สะสม 10 แต้ม/10฿</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-gray-400 text-xs mb-1">ออเดอร์ทั้งหมด</p>
              <p className="font-black text-2xl text-gray-800">{myOrders.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
              <p className="text-gray-400 text-xs mb-1">ยอดสั่งซื้อรวม</p>
              <p className="font-black text-2xl text-blue-600">
                {myOrders.reduce((s, o) => s + (o.total_price || 0), 0)}฿
              </p>
            </div>
          </div>

          <p className="text-gray-700 font-bold text-sm mb-2">ที่อยู่จัดส่งบ่อย</p>
          {savedAddresses.length === 0
            ? <p className="text-gray-400 text-sm">ยังไม่มีที่อยู่บันทึก</p>
            : savedAddresses.map((a, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-2 flex items-center gap-3 shadow-sm">
                <span className="text-xl">📍</span>
                <div className="flex-1">
                  <p className="text-gray-700 text-sm font-medium">{a.address}</p>
                  <p className="text-gray-400 text-xs">ใช้ {a.used_count} ครั้ง</p>
                </div>
                <button onClick={() => { setAddress(a.address); setTab("order") }}
                  className="text-blue-500 text-xs font-semibold">ใช้</button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Bottom Navigation ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 shadow-2xl z-30">
        {/* Cart bar (only on menu step) */}
        {tab === "order" && orderStep === "menu" && itemCount > 0 && (
          <div className="px-4 pt-3">
            <button onClick={() => { setCartOpen(false); setOrderStep("delivery") }}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all
                         flex items-center justify-between px-5">
              <div className="bg-white bg-opacity-20 w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm">
                {itemCount}
              </div>
              <span>ดำเนินการสั่งซื้อ</span>
              <span className="font-black">{total}฿</span>
            </button>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex py-2 px-2">
          {[
            { id: "order",    icon: "🛍️", label: "สั่งสินค้า" },
            { id: "tracking", icon: "📦", label: "ติดตาม",    badge: activeOrderCount },
            { id: "profile",  icon: "👤", label: "โปรไฟล์"   },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "order") setOrderStep("menu") }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all relative
                ${tab === t.id ? "text-blue-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {t.badge > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Flash Deal Countdown ──────────────────────────────────────────
function FlashCountdown({ endAt }) {
  const [left, setLeft] = useState("")
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(endAt) - Date.now()) / 1000))
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      setLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [endAt])
  return <>{left}</>
}

// ── Order Card ────────────────────────────────────────────────────
function OrderCard({ order, onReorder }) {
  const meta   = STATUS_META[order.status] || { color: "text-gray-500", bg: "bg-gray-50", bar: "bg-gray-300", icon: "📦", badge: "bg-gray-100 text-gray-500" }
  const stepIdx = STATUS_STEPS.indexOf(order.status)
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : ""

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`${meta.bg} px-4 py-3 flex items-center justify-between`}>
        <div>
          <p className="text-gray-400 text-[10px]">{createdAt}</p>
          <p className="text-gray-800 font-bold text-sm font-mono">#{shortId}</p>
        </div>
        <span className={`${meta.badge} text-xs font-bold px-3 py-1.5 rounded-full`}>
          {meta.icon} {order.status}
        </span>
      </div>

      <div className="px-4 py-3">
        <p className="text-gray-700 text-sm font-medium mb-1">
          {Array.isArray(order.items_detail)
            ? order.items_detail.map(i => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(", ")
            : Array.isArray(order.items)
            ? [...new Set(order.items)].map(item => {
                const c = order.items.filter(x => x === item).length
                return c > 1 ? `${item} ×${c}` : item
              }).join(", ")
            : order.items
          }
        </p>
        {order.total_price && (
          <p className="text-blue-600 font-bold text-sm mb-1">{order.total_price}฿
            {order.payment_method && <span className="text-gray-400 font-normal ml-2 text-xs">· {order.payment_method === "cash" ? "เงินสด" : order.payment_method === "transfer" ? "โอนเงิน" : "PromptPay"}</span>}
          </p>
        )}
        <p className="text-gray-400 text-xs mb-3">📍 {order.address}{order.note ? ` · 💬 ${order.note}` : ""}</p>

        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-1">
          {STATUS_STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
              <div className={`h-full rounded-full transition-all duration-700 ${i <= stepIdx ? meta.bar : ""}`}
                style={{ width: i <= stepIdx ? "100%" : "0%" }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mb-3">
          {["รอยืนยัน", "กำลังทำ", "จัดส่ง", "สำเร็จ"].map((s, i) => (
            <span key={s} className={`text-[9px] ${i === stepIdx ? meta.color + " font-bold" : "text-gray-300"}`}>{s}</span>
          ))}
        </div>

        {/* Reorder button */}
        {order.status === "ส่งสำเร็จ" && (
          <button onClick={onReorder}
            className="w-full py-2.5 bg-blue-50 border border-blue-200 text-blue-600 font-semibold text-sm rounded-xl active:scale-95 transition-all">
            🔄 สั่งซ้ำออเดอร์นี้
          </button>
        )}
      </div>
    </div>
  )
}