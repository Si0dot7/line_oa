// src/pages/RiderDashboard.jsx
// ✅ v2 — optimistic update, rider_id claim, optimistic lock, auto tab switch
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_META = {
  "กำลังทำ":      { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",   icon: "👨‍🍳", label: "รอรับออเดอร์" },
  "กำลังจัดส่ง": { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", icon: "🛵", label: "กำลังส่ง"     },
  "ส่งสำเร็จ":   { bg: "bg-green-50",  badge: "bg-green-100 text-green-700",   dot: "bg-green-500",  icon: "✅", label: "ส่งสำเร็จ"    },
}

export default function RiderDashboard({ profile }) {
  const riderId = profile?.userId

  const [pendingOrders, setPendingOrders] = useState([])
  const [myOrders,      setMyOrders]      = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [weekEarnings,  setWeekEarnings]  = useState(0)
  const [todayCount,    setTodayCount]    = useState(0)
  const [tab,        setTab]        = useState("active")
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [toast,      setToast]      = useState(null)
  const toastRef = useRef(null)

  // ── Fetch all data ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!riderId) { setLoading(false); return }
    setLoading(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7)

    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from("orders").select("*")
        .eq("status", "กำลังทำ").is("rider_id", null)
        .order("created_at", { ascending: true }).limit(30),

      supabase.from("orders").select("*")
        .eq("status", "กำลังจัดส่ง").eq("rider_id", riderId)
        .order("created_at", { ascending: true }).limit(20),

      supabase.from("orders").select("*")
        .eq("status", "ส่งสำเร็จ").eq("rider_id", riderId)
        .gte("updated_at", todayStart.toISOString())
        .order("updated_at", { ascending: false }).limit(30),

      supabase.from("orders").select("delivery_fee")
        .eq("status", "ส่งสำเร็จ").eq("rider_id", riderId)
        .gte("updated_at", todayStart.toISOString()),

      supabase.from("orders").select("delivery_fee")
        .eq("status", "ส่งสำเร็จ").eq("rider_id", riderId)
        .gte("updated_at", weekStart.toISOString()),
    ])

    setPendingOrders(r1.data || [])
    setMyOrders(r2.data || [])
    setHistoryOrders(r3.data || [])
    if (r4.data) {
      setTodayCount(r4.data.length)
      setTodayEarnings(r4.data.reduce((s, o) => s + (o.delivery_fee || 25), 0))
    }
    if (r5.data) setWeekEarnings(r5.data.reduce((s, o) => s + (o.delivery_fee || 25), 0))
    setLoading(false)
  }, [riderId])

  // ── Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    fetchAll()
    if (!riderId) return

    const ch = supabase.channel(`rider-rt-${riderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ({ eventType, new: updated, old }) => {
        if (eventType === "INSERT" && updated.status === "กำลังทำ" && !updated.rider_id) {
          setPendingOrders(prev =>
            prev.some(x => x.id === updated.id) ? prev :
            [...prev, updated].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          )
        }
        if (eventType === "UPDATE") {
          if (updated.status === "กำลังจัดส่ง" && updated.rider_id !== riderId) {
            // ไรเดอร์อื่นรับไป — เอาออกจาก pending
            setPendingOrders(prev => prev.filter(x => x.id !== updated.id))
          }
          if (updated.status === "กำลังจัดส่ง" && updated.rider_id === riderId) {
            setPendingOrders(prev => prev.filter(x => x.id !== updated.id))
            setMyOrders(prev =>
              prev.some(x => x.id === updated.id)
                ? prev.map(x => x.id === updated.id ? updated : x)
                : [...prev, updated]
            )
          }
          if (updated.status === "ส่งสำเร็จ" || updated.status === "ยกเลิก") {
            setPendingOrders(prev => prev.filter(x => x.id !== updated.id))
            setMyOrders(prev => prev.filter(x => x.id !== updated.id))
            if (updated.status === "ส่งสำเร็จ" && updated.rider_id === riderId) {
              setHistoryOrders(prev => [updated, ...prev])
            }
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [riderId, fetchAll])

  // ── Toast ─────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  // ── รับงาน — Optimistic + Optimistic Lock ────────────────────────
  const acceptOrder = async (order) => {
    if (updatingId) return
    setUpdatingId(order.id)

    // 1️⃣ Optimistic UI ก่อน — ไม่ต้องรอ network
    setPendingOrders(prev => prev.filter(x => x.id !== order.id))
    setMyOrders(prev => [...prev, { ...order, status: "กำลังจัดส่ง", rider_id: riderId }])

    try {
      // 2️⃣ DB: ใช้ WHERE clause เป็น optimistic lock
      // ถ้าไรเดอร์อื่นรับไปก่อน → data จะเป็น [] → rollback
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "กำลังจัดส่ง", rider_id: riderId, updated_at: new Date().toISOString() })
        .eq("id",      order.id)
        .eq("status",  "กำลังทำ")  // lock condition
        .is("rider_id", null)        // lock condition
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        // Rollback: ไรเดอร์อื่นรับไปแล้ว
        setMyOrders(prev => prev.filter(x => x.id !== order.id))
        setPendingOrders(prev =>
          [...prev, order].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        )
        showToast("⚠️ ออเดอร์นี้ถูกรับไปแล้ว", "error")
        return
      }

      // 3️⃣ Notify backend → LINE push
      await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "กำลังจัดส่ง", user_id: order.user_id }),
      }).catch(() => {})

      showToast("🛵 รับงานแล้ว! มุ่งหน้าส่งเลย")
      setExpandedId(null)
      setTab("mine")  // 4️⃣ Auto switch ไปหน้างานฉัน
    } catch (e) {
      setMyOrders(prev => prev.filter(x => x.id !== order.id))
      setPendingOrders(prev =>
        [...prev, order].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      )
      showToast("❌ " + (e.message || "เกิดข้อผิดพลาด"), "error")
    } finally {
      setUpdatingId(null)
    }
  }

  // ── ส่งสำเร็จ — Optimistic ────────────────────────────────────────
  const completeOrder = async (order) => {
    if (updatingId) return
    setUpdatingId(order.id)

    setMyOrders(prev => prev.filter(x => x.id !== order.id)) // Optimistic

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "ส่งสำเร็จ", updated_at: new Date().toISOString() })
        .eq("id", order.id).eq("rider_id", riderId)

      if (error) throw error

      const fee = order.delivery_fee || 25
      setTodayCount(c => c + 1)
      setTodayEarnings(e => e + fee)
      setWeekEarnings(e => e + fee)
      setHistoryOrders(prev => [{ ...order, status: "ส่งสำเร็จ" }, ...prev])

      await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ส่งสำเร็จ", user_id: order.user_id }),
      }).catch(() => {})

      showToast(`✅ ส่งสำเร็จ! +${fee}฿`)
      setExpandedId(null)
      setTab("history")
    } catch (e) {
      setMyOrders(prev => [...prev, order]) // Rollback
      showToast("❌ " + (e.message || "เกิดข้อผิดพลาด"), "error")
    } finally {
      setUpdatingId(null)
    }
  }

  const openMaps = (order) => {
    const url = order.lat && order.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address || "")}`
    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {toast && (
        <div className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-50 px-4 py-3 rounded-2xl shadow-xl
          text-white text-sm font-semibold flex items-center gap-2
          ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="bg-orange-500 px-4 pb-4 pt-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "รอรับ",     value: pendingOrders.length, bg: "bg-orange-400" },
            { label: "กำลังส่ง", value: myOrders.length,      bg: "bg-orange-600" },
            { label: "วันนี้",   value: `${todayEarnings}฿`,  bg: "bg-orange-700" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
              <div className="font-black text-white text-xl leading-none">{s.value}</div>
              <div className="text-orange-100 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        {[
          { id: "active",   label: "งานใหม่",  badge: pendingOrders.length },
          { id: "mine",     label: "งานฉัน",   badge: myOrders.length },
          { id: "history",  label: "ประวัติ" },
          { id: "earnings", label: "รายได้" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-bold relative transition-colors
              ${tab === t.id ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-400"}`}>
            {t.label}
            {t.badge > 0 && (
              <span className="absolute top-1.5 right-1/4 translate-x-1/2 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="px-4 pt-4 space-y-3">
        {tab === "active" && (
          loading ? <Spinner /> :
          pendingOrders.length === 0
            ? <Empty icon="🛵" title="ไม่มีงานใหม่" sub="รอออเดอร์เข้ามา..." />
            : pendingOrders.map(o => (
                <OrderCard key={o.id} order={o} mode="accept"
                  expanded={expandedId === o.id}
                  onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  onAction={() => acceptOrder(o)}
                  onOpenMaps={() => openMaps(o)}
                  updating={updatingId === o.id}
                />
              ))
        )}

        {tab === "mine" && (
          loading ? <Spinner /> :
          myOrders.length === 0
            ? <Empty icon="📦" title="ยังไม่มีงานที่รับ" sub="ไปรับงานในแท็บ งานใหม่" />
            : myOrders.map(o => (
                <OrderCard key={o.id} order={o} mode="complete"
                  expanded={expandedId === o.id}
                  onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  onAction={() => completeOrder(o)}
                  onOpenMaps={() => openMaps(o)}
                  updating={updatingId === o.id}
                />
              ))
        )}

        {tab === "history" && (
          historyOrders.length === 0
            ? <Empty icon="📋" title="ยังไม่มีประวัติวันนี้" sub="" />
            : historyOrders.map(o => <HistoryCard key={o.id} order={o} />)
        )}

        {tab === "earnings" && (
          <EarningsTab
            todayEarnings={todayEarnings}
            weekEarnings={weekEarnings}
            todayCount={todayCount}
          />
        )}
      </div>

      <button onClick={fetchAll}
        className="fixed bottom-6 right-4 w-12 h-12 bg-orange-500 text-white rounded-full shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all z-30">
        🔄
      </button>
    </div>
  )
}

function OrderCard({ order, mode, expanded, onExpand, onAction, onOpenMaps, updating }) {
  const meta = STATUS_META[order.status] || STATUS_META["กำลังทำ"]
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const timeStr = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""
  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map(i => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items) ? order.items.join(", ") : ""
  const isDelivering = order.status === "กำลังจัดส่ง"

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${isDelivering ? "border-orange-300 shadow-orange-100" : "border-gray-100"}`}>

      <div className={`${meta.bg} px-4 py-3 flex items-center justify-between cursor-pointer`} onClick={onExpand}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot} ${isDelivering ? "animate-pulse" : ""}`} />
          <div>
            <p className="font-black text-gray-800 text-sm font-mono">#{shortId}</p>
            <p className="text-gray-400 text-[10px]">{timeStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${meta.badge} text-[11px] font-bold px-2.5 py-1 rounded-full`}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-gray-300 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-gray-700 text-sm font-medium mb-1 truncate">{itemsText || "—"}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="truncate">📍 {order.address || "ไม่ระบุ"}</span>
          {order.total_price && <span className="text-orange-500 font-bold shrink-0">฿{order.total_price}</span>}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <Row label="รายการ"   value={itemsText || "—"} />
            <Row label="ยอดรวม"  value={`${order.total_price || 0}฿`} />
            <Row label="ที่อยู่" value={order.address || "—"} />
            {order.note && <Row label="หมายเหตุ" value={order.note} />}
          </div>

          <div className="flex gap-2">
            <button onClick={onOpenMaps}
              className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-bold active:scale-95 transition-all">
              🗺️ นำทาง
            </button>

            {mode === "accept" && (
              <button disabled={updating} onClick={onAction}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-200 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                {updating ? "⏳ กำลังรับ..." : "🛵 รับงานนี้"}
              </button>
            )}

            {mode === "complete" && (
              <button disabled={updating} onClick={onAction}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold shadow-md shadow-green-200 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                {updating ? "⏳ กำลังบันทึก..." : "✅ ส่งสำเร็จ"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryCard({ order }) {
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const timeStr = order.updated_at
    ? new Date(order.updated_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""
  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map(i => `${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items) ? order.items.join(", ") : ""

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">✅</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-black text-gray-800 text-sm font-mono">#{shortId}</span>
          <span className="text-green-600 font-bold text-sm">+{order.delivery_fee || 25}฿</span>
        </div>
        <p className="text-gray-400 text-xs truncate">{itemsText}</p>
        <p className="text-gray-300 text-[10px]">{timeStr} · {order.address}</p>
      </div>
    </div>
  )
}

function EarningsTab({ todayEarnings, weekEarnings, todayCount }) {
  const avg = todayCount > 0 ? Math.round(todayEarnings / todayCount) : 0
  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-center shadow-xl shadow-orange-200">
        <p className="text-orange-100 text-sm font-semibold mb-1">รายได้วันนี้</p>
        <p className="text-white text-5xl font-black">{todayEarnings}<span className="text-2xl ml-1">฿</span></p>
        <p className="text-orange-100 text-xs mt-2">{todayCount} งาน · เฉลี่ย {avg}฿/งาน</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "สัปดาห์นี้", value: `${weekEarnings}฿`, icon: "📅", color: "text-indigo-600" },
          { label: "งานวันนี้",  value: `${todayCount} งาน`, icon: "📦", color: "text-blue-600"   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-gray-500 font-semibold">{title}</p>
      {sub && <p className="text-gray-300 text-sm mt-1">{sub}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400 text-xs shrink-0">{label}</span>
      <span className="text-gray-700 text-xs font-medium text-right">{value}</span>
    </div>
  )
}