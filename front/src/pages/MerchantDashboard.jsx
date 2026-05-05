// src/pages/MerchantDashboard.jsx
import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_OPTIONS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]
const STATUS_META = {
  "รอร้านยืนยัน": { color: "text-amber-600",  bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700",   border: "border-amber-200",  bar: "bg-amber-400",  btnBg: "bg-amber-500 hover:bg-amber-600",   icon: "⏳", dot: "bg-amber-400"  },
  "กำลังทำ":      { color: "text-blue-600",    bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",     border: "border-blue-200",   bar: "bg-blue-500",   btnBg: "bg-blue-600 hover:bg-blue-700",     icon: "👨‍🍳", dot: "bg-blue-500"   },
  "กำลังจัดส่ง": { color: "text-purple-600",  bg: "bg-purple-50",  badge: "bg-purple-100 text-purple-700", border: "border-purple-200", bar: "bg-purple-500", btnBg: "bg-purple-600 hover:bg-purple-700", icon: "🛵", dot: "bg-purple-500" },
  "ส่งสำเร็จ":   { color: "text-green-600",   bg: "bg-green-50",   badge: "bg-green-100 text-green-700",   border: "border-green-200",  bar: "bg-green-500",  btnBg: "bg-green-600 hover:bg-green-700",   icon: "✅", dot: "bg-green-500"  },
}
const NEXT_STATUS = { "รอร้านยืนยัน": "กำลังทำ", "กำลังทำ": "กำลังจัดส่ง", "กำลังจัดส่ง": "ส่งสำเร็จ", "ส่งสำเร็จ": null }
const NEXT_LABEL  = { "รอร้านยืนยัน": "✅ ยืนยันออเดอร์", "กำลังทำ": "🛵 ส่งออก", "กำลังจัดส่ง": "✅ ส่งสำเร็จ" }

const CATEGORIES = ["ข้าว", "เส้น", "ยำ/ต้ม", "พิเศษ", "เครื่องดื่ม", "ของหวาน", "อื่นๆ"]
const EMOJI_PRESETS = ["🍗","🍖","🍜","🌶️","🌿","🦐","🫕","🥚","🐟","🍳","🍱","🍛","🥗","🍢","🧆","🥤","🧃","☕","🍰","🧁"]

// ── Realtime Orders hook ──────────────────────────────────────────
function useRealtimeOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100)
    if (data) setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const ch = supabase.channel("merchant-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders(prev => [payload.new, ...prev])
        } else if (payload.eventType === "UPDATE") {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  return { orders, loading, refetch: fetchOrders }
}

// ── Menu Management hook ──────────────────────────────────────────
function useMenuManagement() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMenu = async () => {
    const { data } = await supabase.from("menu_items").select("*").order("sort_order", { ascending: true })
    if (data) setMenuItems(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  const addItem = async (item) => {
    const maxSort = menuItems.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
    const { data, error } = await supabase.from("menu_items").insert({
      ...item,
      sort_order: maxSort + 1,
      sold_count: 0,
      rating: 4.5,
    }).select().single()
    if (error) throw new Error(error.message)
    setMenuItems(prev => [...prev, data])
    return data
  }

  const updateItem = async (id, updates) => {
    const { error } = await supabase.from("menu_items").update(updates).eq("id", id)
    if (error) throw new Error(error.message)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id)
    if (error) throw new Error(error.message)
    setMenuItems(prev => prev.filter(i => i.id !== id))
  }

  const toggleAvailable = async (id, current) => {
    await updateItem(id, { is_available: !current })
  }

  return { menuItems, loading, addItem, updateItem, deleteItem, toggleAvailable, refetch: fetchMenu }
}

// ── Flash Deals hook ──────────────────────────────────────────────
function useFlashDeals(menuItems) {
  const [deals, setDeals] = useState([])

  const fetchDeals = async () => {
    const { data } = await supabase.from("flash_deals").select("*, menu_items(name, emoji)").order("created_at", { ascending: false }).limit(10)
    if (data) setDeals(data)
  }

  useEffect(() => { fetchDeals() }, [])

  const addDeal = async (deal) => {
    const { data, error } = await supabase.from("flash_deals").insert({ ...deal, is_active: true }).select().single()
    if (error) throw new Error(error.message)
    fetchDeals()
    return data
  }

  const removeDeal = async (id) => {
    await supabase.from("flash_deals").update({ is_active: false }).eq("id", id)
    fetchDeals()
  }

  return { deals, addDeal, removeDeal, refetch: fetchDeals }
}

// ─────────────────────────────────────────────────────────────────────
export default function MerchantDashboard({ profile }) {
  const [dashTab, setDashTab]       = useState("orders")    // orders | menu | deals | analytics
  const [filterStatus, setFilterStatus] = useState("รอร้านยืนยัน")
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [toast, setToast]           = useState(null)
  const toastTimer = useRef(null)

  // Menu form
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [editingItem, setEditingItem]   = useState(null)
  const [menuForm, setMenuForm]         = useState({ name: "", price: "", emoji: "🍽️", category: "ข้าว", description: "", is_available: true, is_popular: false })

  // Deal form
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealForm, setDealForm]         = useState({ menu_item_id: "", discount_percent: 10, start_at: "", end_at: "" })

  const { orders, loading: ordersLoading, refetch: refetchOrders } = useRealtimeOrders()
  const { menuItems, loading: menuLoading, addItem, updateItem, deleteItem, toggleAvailable } = useMenuManagement()
  const { deals, addDeal, removeDeal } = useFlashDeals(menuItems)

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  // ── Order Status Update ─────────────────────────────────────────
  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)
      if (error) throw new Error(error.message)
      setLastUpdate(new Date())

      // แจ้งผ่าน Backend (LINE push)
      const order = orders.find(o => o.id === orderId)
      if (order) {
        await fetch(`${API_URL}/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, user_id: order.user_id }),
        }).catch(() => {})
      }

      // เพิ่ม points เมื่อส่งสำเร็จ
      if (status === "ส่งสำเร็จ" && order) {
        const earned = Math.floor((order.subtotal || order.total_price || 0) / 10)
        if (earned > 0) {
          const { data: existing } = await supabase.from("user_points").select("points").eq("user_id", order.user_id).single()
          await supabase.from("user_points").upsert({
            user_id: order.user_id,
            points: (existing?.points || 0) + earned,
          }, { onConflict: "user_id" })
        }
      }
      showToast(`✅ อัปเดตเป็น "${status}" แล้ว`)
    } catch (e) {
      showToast("❌ " + e.message, "error")
    }
    setUpdatingId(null)
  }

  // ── Menu CRUD ───────────────────────────────────────────────────
  const openAddMenu = () => {
    setEditingItem(null)
    setMenuForm({ name: "", price: "", emoji: "🍽️", category: "ข้าว", description: "", is_available: true, is_popular: false })
    setShowMenuForm(true)
  }

  const openEditMenu = (item) => {
    setEditingItem(item)
    setMenuForm({ name: item.name, price: String(item.price), emoji: item.emoji || "🍽️", category: item.category || "ข้าว", description: item.description || "", is_available: item.is_available, is_popular: item.is_popular || false })
    setShowMenuForm(true)
  }

  const saveMenu = async () => {
    if (!menuForm.name.trim()) return showToast("❌ กรุณาใส่ชื่อเมนู", "error")
    if (!menuForm.price || isNaN(menuForm.price)) return showToast("❌ กรุณาใส่ราคาที่ถูกต้อง", "error")
    try {
      const payload = { ...menuForm, price: parseFloat(menuForm.price) }
      if (editingItem) {
        await updateItem(editingItem.id, payload)
        showToast("✅ แก้ไขเมนูแล้ว")
      } else {
        await addItem(payload)
        showToast("✅ เพิ่มเมนูแล้ว")
      }
      setShowMenuForm(false)
    } catch (e) { showToast("❌ " + e.message, "error") }
  }

  const confirmDelete = async (item) => {
    if (!window.confirm(`ลบ "${item.name}" ออกจากเมนู?`)) return
    try { await deleteItem(item.id); showToast("🗑️ ลบแล้ว") }
    catch (e) { showToast("❌ " + e.message, "error") }
  }

  // ── Deal Save ───────────────────────────────────────────────────
  const saveDeal = async () => {
    if (!dealForm.menu_item_id) return showToast("❌ เลือกเมนูก่อน", "error")
    if (!dealForm.start_at || !dealForm.end_at) return showToast("❌ ระบุเวลาก่อน", "error")
    try {
      await addDeal(dealForm)
      setShowDealForm(false)
      showToast("⚡ เพิ่ม Flash Deal แล้ว!")
    } catch (e) { showToast("❌ " + e.message, "error") }
  }

  // ── Stats ───────────────────────────────────────────────────────
  const stats = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = orders.filter(o => o.status === s).length; return acc }, {})
  const pendingCount   = stats["รอร้านยืนยัน"]
  const todayRevenue   = orders.filter(o => o.status === "ส่งสำเร็จ" && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (o.total_price || 0), 0)
  const filteredOrders = filterStatus === "ทั้งหมด" ? orders : orders.filter(o => o.status === filterStatus)

  const openMap = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl
          ${toast.type === "error" ? "bg-red-500" : "bg-gray-800"}`}
          style={{ maxWidth: "90vw", textAlign: "center" }}>
          {toast.msg}
        </div>
      )}

      {/* ── Menu Form Sheet ── */}
      {showMenuForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end" onClick={() => setShowMenuForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 pb-10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-gray-800 text-lg mb-4">{editingItem ? "✏️ แก้ไขเมนู" : "➕ เพิ่มเมนูใหม่"}</h3>

            {/* Emoji Picker */}
            <p className="text-gray-500 text-sm font-semibold mb-2">เลือกไอคอน</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {EMOJI_PRESETS.map(e => (
                <button key={e} onClick={() => setMenuForm(f => ({ ...f, emoji: e }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                    ${menuForm.emoji === e ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100"}`}>
                  {e}
                </button>
              ))}
              <input value={menuForm.emoji} onChange={e => setMenuForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-10 h-10 rounded-xl text-center border border-dashed border-gray-300 text-xl focus:outline-none focus:border-blue-400"
                maxLength={2} placeholder="?" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">ชื่อเมนู *</p>
                <input value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น ข้าวมันไก่"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">ราคา (฿) *</p>
                <input value={menuForm.price} onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="50" type="number" min="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]" />
              </div>
            </div>

            <div className="mb-3">
              <p className="text-gray-500 text-xs font-semibold mb-1">หมวดหมู่</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setMenuForm(f => ({ ...f, category: cat }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all
                      ${menuForm.category === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-500 text-xs font-semibold mb-1">คำอธิบาย</p>
              <input value={menuForm.description} onChange={e => setMenuForm(f => ({ ...f, description: e.target.value }))}
                placeholder="เช่น ไก่ต้มนุ่ม น้ำซุปหอม"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]" />
            </div>

            <div className="flex gap-4 mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setMenuForm(f => ({ ...f, is_available: !f.is_available }))}
                  className={`w-10 h-6 rounded-full transition-all relative ${menuForm.is_available ? "bg-green-500" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${menuForm.is_available ? "left-4.5" : "left-0.5"}`}
                    style={{ left: menuForm.is_available ? "calc(100% - 22px)" : "2px" }} />
                </div>
                <span className="text-sm font-semibold text-gray-700">เปิดขาย</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setMenuForm(f => ({ ...f, is_popular: !f.is_popular }))}
                  className={`w-10 h-6 rounded-full transition-all relative ${menuForm.is_popular ? "bg-red-500" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all`}
                    style={{ left: menuForm.is_popular ? "calc(100% - 22px)" : "2px" }} />
                </div>
                <span className="text-sm font-semibold text-gray-700">🔥 ยอดนิยม</span>
              </label>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-dashed border-gray-200">
              <span className="text-3xl">{menuForm.emoji}</span>
              <div>
                <p className="font-bold text-gray-800">{menuForm.name || "ชื่อเมนู"}</p>
                <p className="text-blue-600 font-black">{menuForm.price || "0"}฿</p>
              </div>
              {menuForm.is_popular && <span className="ml-auto bg-red-100 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">ยอดนิยม</span>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowMenuForm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95">ยกเลิก</button>
              <button onClick={saveMenu} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95">
                {editingItem ? "💾 บันทึก" : "➕ เพิ่มเมนู"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deal Form Sheet ── */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end" onClick={() => setShowDealForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-gray-800 text-lg mb-4">⚡ สร้าง Flash Deal</h3>

            <p className="text-gray-500 text-xs font-semibold mb-1">เลือกเมนู</p>
            <select value={dealForm.menu_item_id} onChange={e => setDealForm(f => ({ ...f, menu_item_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:border-orange-400 font-[inherit] bg-white">
              <option value="">-- เลือกเมนู --</option>
              {menuItems.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name} ({m.price}฿)</option>)}
            </select>

            <p className="text-gray-500 text-xs font-semibold mb-1">ส่วนลด (%)</p>
            <div className="flex gap-2 mb-3">
              {[10, 15, 20, 25, 30, 50].map(p => (
                <button key={p} onClick={() => setDealForm(f => ({ ...f, discount_percent: p }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                    ${dealForm.discount_percent === p ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {p}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">เริ่ม</p>
                <input type="datetime-local" value={dealForm.start_at} onChange={e => setDealForm(f => ({ ...f, start_at: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-[inherit]" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-1">สิ้นสุด</p>
                <input type="datetime-local" value={dealForm.end_at} onChange={e => setDealForm(f => ({ ...f, end_at: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-[inherit]" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowDealForm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95">ยกเลิก</button>
              <button onClick={saveDeal} className="flex-[2] py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 active:scale-95">
                ⚡ เปิด Flash Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          HEADER BANNER
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-xs">แดชบอร์ดร้านค้า</p>
            <p className="text-white font-black text-lg">จัดการออเดอร์ 📋</p>
          </div>
          <div className="text-right">
            {pendingCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse mb-1">
                🔔 {pendingCount} ใหม่!
              </div>
            )}
            <p className="text-indigo-200 text-[10px]">อัปเดต {lastUpdate.toLocaleTimeString("th-TH")}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map(s => {
            const m = STATUS_META[s]
            return (
              <div key={s} className="bg-white bg-opacity-15 rounded-xl p-2 text-center">
                <p className=" font-black text-xl leading-none">{stats[s]}</p>
                <p className="text-[10px] mt-0.5">{m.icon}</p>
              </div>
            )
          })}
        </div>

        {/* Revenue */}
        <div className="mt-3 bg-white bg-opacity-15 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm">💰 รายได้วันนี้</p>
          <p className=" font-black text-lg">{todayRevenue.toLocaleString()}฿</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DASH TABS
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[52px] z-10">
        <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1">
          {[
            { id: "orders",    label: "ออเดอร์",  icon: "📋", badge: pendingCount },
            { id: "menu",      label: "จัดการเมนู", icon: "🍽️"  },
            { id: "deals",     label: "Flash Deal", icon: "⚡"  },
            { id: "analytics", label: "สถิติ",     icon: "📊"  },
          ].map(t => (
            <button key={t.id} onClick={() => setDashTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 relative
                ${dashTab === t.id ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-500"}`}>
              {t.icon} {t.label}
              {t.badge > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-0.5">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ORDERS TAB
      ═══════════════════════════════════════════════════════════ */}
      {dashTab === "orders" && (
        <div>
          {/* Filter Tabs */}
          <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-2 bg-white border-b border-gray-100">
            {["ทั้งหมด", ...STATUS_OPTIONS].map(s => {
              const m = s !== "ทั้งหมด" ? STATUS_META[s] : null
              const count = s === "ทั้งหมด" ? orders.length : stats[s]
              const isActive = filterStatus === s
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1
                    ${isActive
                      ? s === "ทั้งหมด" ? "bg-indigo-600 text-white shadow-md" : `${m.btnBg} text-white shadow-md`
                      : "bg-gray-100 text-gray-500"
                    }`}>
                  {m?.icon || "📋"} {s === "ทั้งหมด" ? "ทั้งหมด" : s.replace("รอร้านยืนยัน","รอยืนยัน").replace("กำลังจัดส่ง","จัดส่ง")}
                  {count > 0 && <span className={`${isActive ? "bg-white bg-opacity-30" : "bg-gray-300"} rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold text-inherit`}>{count}</span>}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-600 font-semibold text-sm">{filterStatus === "ทั้งหมด" ? `ทั้งหมด ${orders.length} รายการ` : `${filterStatus} · ${filteredOrders.length}`}</span>
            <button onClick={refetchOrders} className="text-indigo-600 text-sm font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 active:scale-95 transition-all">🔄 รีเฟรช</button>
          </div>

          {ordersLoading
            ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            : filteredOrders.length === 0
            ? <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-400 font-medium">ไม่มีออเดอร์ใน "{filterStatus}"</p>
              </div>
            : (
              <div className="flex flex-col gap-3 px-4 pb-4">
                {filteredOrders.map(order => {
                  const m = STATUS_META[order.status] || STATUS_META["รอร้านยืนยัน"]
                  const isUpdating = updatingId === order.id
                  const isExpanded = expandedId === order.id
                  const nextStatus = NEXT_STATUS[order.status]
                  const nextLabel  = NEXT_LABEL[order.status]
                  const shortId    = order.id?.toString().slice(-6).toUpperCase()
                  const createdAt  = order.created_at ? new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""

                  return (
                    <div key={order.id}
                      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 border ${m.border}
                        ${isUpdating ? "opacity-60 scale-98" : ""}`}>

                      {/* Status Strip */}
                      <div className={`${m.bg} px-4 py-2.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${m.dot} ${order.status !== "ส่งสำเร็จ" ? "animate-pulse" : ""}`} />
                          <span className="text-gray-500 text-xs font-mono">#{shortId} · {createdAt}</span>
                        </div>
                        <span className={`${m.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>{m.icon} {order.status}</span>
                      </div>

                      <div className="px-4 py-3">
                        {/* Customer */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500 text-xs">👤 {order.display_name || "ลูกค้า"}</span>
                          {order.total_price && <span className="font-black text-blue-600">{order.total_price}฿</span>}
                        </div>

                        {/* Items */}
                        <p className="text-gray-800 font-semibold text-sm mb-1">
                          {Array.isArray(order.items_detail)
                            ? order.items_detail.map(i => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(" · ")
                            : Array.isArray(order.items)
                            ? [...new Set(order.items)].map(item => {
                                const c = order.items.filter(x => x === item).length
                                return c > 1 ? `${item} ×${c}` : item
                              }).join(", ")
                            : order.items
                          }
                        </p>

                        <p className="text-gray-400 text-xs mb-1 flex items-start gap-1">
                          <span className="mt-0.5">📍</span><span>{order.address}</span>
                        </p>
                        {order.payment_method && (
                          <p className="text-gray-400 text-xs mb-1">💳 {order.payment_method === "cash" ? "เงินสด" : order.payment_method === "transfer" ? "โอนเงิน" : "PromptPay"}</p>
                        )}
                        {order.note && (
                          <p className="text-amber-600 text-xs mb-3 bg-amber-50 px-2.5 py-1.5 rounded-lg">💬 {order.note}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button onClick={() => openMap(order.lat, order.lng)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200
                                       hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                            🗺️ แผนที่
                          </button>
                          {nextStatus && (
                            <button onClick={() => updateStatus(order.id, nextStatus)} disabled={isUpdating}
                              className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white
                                         ${m.btnBg} active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50`}>
                              {isUpdating
                                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> อัปเดต...</>
                                : nextLabel
                              }
                            </button>
                          )}
                          <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="w-10 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center">
                            {isExpanded ? "▲" : "▾"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">เปลี่ยนสถานะ</p>
                            <div className="grid grid-cols-2 gap-2">
                              {STATUS_OPTIONS.filter(s => s !== order.status).map(s => {
                                const sm = STATUS_META[s]
                                return (
                                  <button key={s} onClick={() => { updateStatus(order.id, s); setExpandedId(null) }} disabled={isUpdating}
                                    className={`py-2 rounded-xl text-xs font-bold ${sm.badge} border ${sm.border} active:scale-95 transition-all flex items-center justify-center gap-1`}>
                                    {sm.icon} {s.replace("รอร้านยืนยัน","รอยืนยัน").replace("กำลังจัดส่ง","จัดส่ง")}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MENU MANAGEMENT TAB
      ═══════════════════════════════════════════════════════════ */}
      {dashTab === "menu" && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-gray-800 text-lg">จัดการเมนู</h2>
              <p className="text-gray-400 text-xs">{menuItems.length} รายการ · {menuItems.filter(m => m.is_available).length} เปิดขาย</p>
            </div>
            <button onClick={openAddMenu}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all">
              ➕ เพิ่มเมนู
            </button>
          </div>

          {menuLoading
            ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            : menuItems.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-gray-400 font-medium mb-5">ยังไม่มีเมนู</p>
                <button onClick={openAddMenu} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95">เพิ่มเมนูแรก</button>
              </div>
            )
            : (
              <div className="flex flex-col gap-3 pb-4">
                {menuItems.map(item => (
                  <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                    ${item.is_available ? "border-gray-100" : "border-red-100 opacity-60"}`}>
                    <div className="flex items-center gap-3 p-3">
                      {/* Emoji / Image */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0
                        ${item.is_available ? "bg-gray-50" : "bg-red-50"}`}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                          : item.emoji || "🍽️"
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                          {item.is_popular && <span className="bg-red-100 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">🔥 ยอดนิยม</span>}
                          {!item.is_available && <span className="bg-gray-100 text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">ปิด</span>}
                        </div>
                        <p className="text-blue-600 font-black">{item.price}฿ <span className="text-gray-300 font-normal text-xs">· {item.category}</span></p>
                        {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                        <p className="text-gray-300 text-[10px]">★{item.rating?.toFixed(1)} · ขายแล้ว {item.sold_count || 0} ครั้ง</p>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {/* Toggle Available */}
                        <button onClick={() => toggleAvailable(item.id, item.is_available)}
                          className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${item.is_available ? "bg-green-500" : "bg-gray-300"}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all`}
                            style={{ left: item.is_available ? "calc(100% - 22px)" : "2px" }} />
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEditMenu(item)}
                          className="w-10 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-blue-100 active:scale-90 transition-all">
                          ✏️
                        </button>
                        {/* Delete */}
                        <button onClick={() => confirmDelete(item)}
                          className="w-10 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-sm hover:bg-red-100 active:scale-90 transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          FLASH DEALS TAB
      ═══════════════════════════════════════════════════════════ */}
      {dashTab === "deals" && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-gray-800 text-lg">⚡ Flash Deals</h2>
              <p className="text-gray-400 text-xs">โปรโมชั่นพิเศษระยะเวลาจำกัด</p>
            </div>
            <button onClick={() => setShowDealForm(true)}
              className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition-all">
              ⚡ สร้าง Deal
            </button>
          </div>

          {deals.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">⚡</div>
                <p className="text-gray-400 font-medium mb-2">ยังไม่มี Flash Deal</p>
                <p className="text-gray-300 text-sm mb-5">สร้าง Deal เพื่อดึงดูดลูกค้า</p>
                <button onClick={() => setShowDealForm(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95">สร้าง Deal แรก</button>
              </div>
            )
            : (
              <div className="flex flex-col gap-3 pb-4">
                {deals.map(deal => {
                  const now = Date.now()
                  const isActive = deal.is_active && new Date(deal.start_at) <= now && new Date(deal.end_at) >= now
                  const isExpired = new Date(deal.end_at) < now
                  return (
                    <div key={deal.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isActive ? "border-orange-200" : "border-gray-100 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{deal.menu_items?.emoji || "🍽️"}</span>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{deal.menu_items?.name}</p>
                            <p className="text-orange-500 font-black text-lg">-{deal.discount_percent}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isActive ? "bg-green-100 text-green-600" : isExpired ? "bg-gray-100 text-gray-400" : "bg-yellow-100 text-yellow-600"}`}>
                            {isActive ? "🟢 Active" : isExpired ? "หมดเวลา" : "รอเวลา"}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs mb-3">
                        {new Date(deal.start_at).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} — {new Date(deal.end_at).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <button onClick={() => removeDeal(deal.id)}
                        className="w-full py-2 bg-red-50 text-red-400 text-xs font-semibold rounded-xl border border-red-100 active:scale-95 transition-all">
                        ❌ ปิด Deal นี้
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ANALYTICS TAB
      ═══════════════════════════════════════════════════════════ */}
      {dashTab === "analytics" && (
        <div className="px-4 pt-4 pb-4">
          <h2 className="font-black text-gray-800 text-lg mb-4">📊 สถิติ</h2>

          {/* Revenue Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "รายได้วันนี้",    value: `${todayRevenue.toLocaleString()}฿`, icon: "💰", color: "text-green-600" },
              { label: "ออเดอร์สำเร็จ",  value: stats["ส่งสำเร็จ"],                  icon: "✅", color: "text-blue-600"  },
              { label: "รอดำเนินการ",     value: stats["รอร้านยืนยัน"],               icon: "⏳", color: "text-amber-600" },
              { label: "เมนูทั้งหมด",    value: menuItems.length,                     icon: "🍽️", color: "text-indigo-600" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl mb-1">{c.icon}</p>
                <p className={`font-black text-2xl ${c.color}`}>{c.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Top Menu */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <p className="font-bold text-gray-800 text-sm mb-3">🏆 เมนูยอดนิยม</p>
            {menuItems.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 5).map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-300 font-black text-sm w-4">{i + 1}</span>
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-700 text-sm">{item.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (item.sold_count || 0) / 5)}%` }} />
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{item.sold_count || 0} ครั้ง</span>
              </div>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-gray-800 text-sm mb-3">💳 วิธีชำระเงิน</p>
            {["cash", "transfer", "promptpay"].map(pm => {
              const count = orders.filter(o => o.payment_method === pm).length
              const pct = orders.length > 0 ? Math.round(count / orders.length * 100) : 0
              const label = pm === "cash" ? "💵 เงินสด" : pm === "transfer" ? "🏦 โอนเงิน" : "📱 PromptPay"
              return (
                <div key={pm} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{label}</span><span>{pct}% · {count} ออเดอร์</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 shadow-xl z-20">
        <div className="flex py-2 px-2">
          {[
            { id: "orders",    icon: "📋", label: "ออเดอร์",   badge: pendingCount },
            { id: "menu",      icon: "🍽️", label: "เมนู"      },
            { id: "deals",     icon: "⚡", label: "Deals"      },
            { id: "analytics", icon: "📊", label: "สถิติ"      },
          ].map(t => (
            <button key={t.id} onClick={() => setDashTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all relative
                ${dashTab === t.id ? "text-indigo-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {t.badge > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}