// src/pages/RiderDashboard.jsx
import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// orders ที่ไรเดอร์เห็นได้ = "กำลังจัดส่ง" (กำลังส่ง) และ "กำลังทำ" (รอรับ)
const RIDER_STATUSES = ["กำลังทำ", "กำลังจัดส่ง"]

const STATUS_META = {
  "กำลังทำ":      { bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",     border: "border-blue-200",  icon: "👨‍🍳", dot: "bg-blue-500",    label: "รอรับออเดอร์"  },
  "กำลังจัดส่ง": { bg: "bg-orange-50",  badge: "bg-orange-100 text-orange-700", border: "border-orange-200",icon: "🛵", dot: "bg-orange-500",  label: "กำลังส่ง"      },
  "ส่งสำเร็จ":   { bg: "bg-green-50",   badge: "bg-green-100 text-green-700",   border: "border-green-200", icon: "✅", dot: "bg-green-500",   label: "ส่งสำเร็จ"     },
  "ยกเลิก":      { bg: "bg-gray-50",    badge: "bg-gray-100 text-gray-500",     border: "border-gray-200",  icon: "❌", dot: "bg-gray-400",    label: "ยกเลิก"        },
}

// ── Realtime hook: ดึง orders ที่ไรเดอร์ต้องจัดการ ────────────────────
function useRiderOrders() {
  const [activeOrders, setActiveOrders] = useState([])   // กำลังทำ / กำลังจัดส่ง
  const [historyOrders, setHistoryOrders] = useState([]) // ส่งสำเร็จวันนี้
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    // Active orders
    const { data: active } = await supabase
      .from("orders")
      .select("*")
      .in("status", RIDER_STATUSES)
      .order("created_at", { ascending: true }) // เก่าสุดก่อน = FIFO
      .limit(50)

    // History: ส่งสำเร็จวันนี้
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: history } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "ส่งสำเร็จ")
      .gte("updated_at", todayStart.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30)

    if (active) setActiveOrders(active)
    if (history) setHistoryOrders(history)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const ch = supabase
      .channel("rider-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          if (RIDER_STATUSES.includes(payload.new.status)) {
            setActiveOrders(prev => [...prev, payload.new].sort((a, b) =>
              new Date(a.created_at) - new Date(b.created_at)
            ))
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new
          if (updated.status === "ส่งสำเร็จ" || updated.status === "ยกเลิก") {
            // ย้ายออกจาก active
            setActiveOrders(prev => prev.filter(o => o.id !== updated.id))
            if (updated.status === "ส่งสำเร็จ") {
              setHistoryOrders(prev => [updated, ...prev])
            }
          } else if (RIDER_STATUSES.includes(updated.status)) {
            setActiveOrders(prev =>
              prev.some(o => o.id === updated.id)
                ? prev.map(o => o.id === updated.id ? updated : o)
                : [...prev, updated]
            )
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  return { activeOrders, historyOrders, loading, refetch: fetchOrders }
}

// ── Earnings hook ─────────────────────────────────────────────────────
function useEarnings(riderId) {
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [weekEarnings, setWeekEarnings]   = useState(0)
  const DELIVERY_FEE = 25 // ค่าส่งต่อออเดอร์

  useEffect(() => {
    const calcEarnings = async () => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7)

      const { data: todayData } = await supabase
        .from("orders")
        .select("delivery_fee")
        .eq("status", "ส่งสำเร็จ")
        .gte("updated_at", todayStart.toISOString())

      const { data: weekData } = await supabase
        .from("orders")
        .select("delivery_fee")
        .eq("status", "ส่งสำเร็จ")
        .gte("updated_at", weekStart.toISOString())

      if (todayData) setTodayEarnings(todayData.reduce((s, o) => s + (o.delivery_fee || DELIVERY_FEE), 0))
      if (weekData)  setWeekEarnings(weekData.reduce((s, o) => s + (o.delivery_fee || DELIVERY_FEE), 0))
    }
    calcEarnings()
  }, [riderId])

  return { todayEarnings, weekEarnings }
}

// ─────────────────────────────────────────────────────────────────────
export default function RiderDashboard({ profile }) {
  const [tab, setTab]             = useState("active")   // active | history | earnings
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [toast, setToast]         = useState(null)
  const toastTimer = useRef(null)

  const { activeOrders, historyOrders, loading, refetch } = useRiderOrders()
  const { todayEarnings, weekEarnings } = useEarnings(profile?.userId)

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  // ── อัปเดต status ──────────────────────────────────────────────────
  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)

      if (error) throw new Error(error.message)

      // แจ้ง backend ส่ง LINE push
      const order = activeOrders.find(o => o.id === orderId)
      if (order) {
        await fetch(`${API_URL}/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, user_id: order.user_id }),
        }).catch(() => {}) // ไม่ block ถ้า backend down
      }

      showToast(
        newStatus === "กำลังจัดส่ง" ? "🛵 รับงานแล้ว! มุ่งหน้าส่งเลย" : "✅ ส่งสำเร็จ! เก็บเงินได้เลย"
      )
      setExpandedId(null)
    } catch (e) {
      showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error")
    } finally {
      setUpdatingId(null)
    }
  }

  // ── เปิด Google Maps นำทาง ─────────────────────────────────────────
  const openMaps = (order) => {
    if (order.lat && order.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`, "_blank")
    } else if (order.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`, "_blank")
    }
  }

  const pendingCount   = activeOrders.filter(o => o.status === "กำลังทำ").length
  const deliveringCount = activeOrders.filter(o => o.status === "กำลังจัดส่ง").length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-50 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold
          flex items-center gap-2 transition-all
          ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="bg-orange-500 px-4 pt-4 pb-6">
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon="⏳" label="รอรับ"    value={pendingCount}    color="bg-white bg-opacity-20 text-white" />
          <SummaryCard icon="🛵" label="กำลังส่ง" value={deliveringCount} color="bg-white bg-opacity-20 text-white" />
          <SummaryCard icon="💰" label="วันนี้"   value={`${todayEarnings}฿`} color="bg-white bg-opacity-20 text-white" />
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex max-w-md mx-auto">
          {[
            { id: "active",   label: "งานที่รับได้",  badge: activeOrders.length },
            { id: "history",  label: "ประวัติวันนี้",  badge: historyOrders.length },
            { id: "earnings", label: "รายได้"          },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-bold relative transition-colors
                ${tab === t.id ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-400"}`}>
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">

        {/* ══════════════════════════════════════════════════════════
            TAB: งานที่รับได้
        ══════════════════════════════════════════════════════════ */}
        {tab === "active" && (
          <>
            {loading ? (
              <div className="text-center py-16 text-gray-400">กำลังโหลด...</div>
            ) : activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-3">🛵</div>
                <p className="text-gray-500 font-bold text-lg">ยังไม่มีงาน</p>
                <p className="text-gray-400 text-sm mt-1">รอออเดอร์ใหม่เข้ามาเลย!</p>
                <button onClick={refetch}
                  className="mt-4 px-5 py-2 bg-orange-100 text-orange-600 rounded-xl font-semibold text-sm active:scale-95">
                  🔄 รีเฟรช
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* แสดง "กำลังจัดส่ง" ก่อน (งานที่รับแล้ว) */}
                {[...activeOrders]
                  .sort((a, b) => {
                    if (a.status === "กำลังจัดส่ง" && b.status !== "กำลังจัดส่ง") return -1
                    if (b.status === "กำลังจัดส่ง" && a.status !== "กำลังจัดส่ง") return 1
                    return new Date(a.created_at) - new Date(b.created_at)
                  })
                  .map(order => (
                    <ActiveOrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedId === order.id}
                      onExpand={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      onUpdateStatus={updateStatus}
                      onOpenMaps={openMaps}
                      updating={updatingId === order.id}
                    />
                  ))
                }
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: ประวัติวันนี้
        ══════════════════════════════════════════════════════════ */}
        {tab === "history" && (
          <>
            {historyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-3">📋</div>
                <p className="text-gray-500 font-bold">ยังไม่มีประวัติวันนี้</p>
                <p className="text-gray-400 text-sm mt-1">งานที่ส่งสำเร็จจะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyOrders.map(order => (
                  <HistoryCard key={order.id} order={order} />
                ))}
                <p className="text-center text-gray-300 text-xs py-4">
                  แสดงงานส่งสำเร็จวันนี้ทั้งหมด {historyOrders.length} รายการ
                </p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: รายได้
        ══════════════════════════════════════════════════════════ */}
        {tab === "earnings" && (
          <EarningsTab
            todayEarnings={todayEarnings}
            weekEarnings={weekEarnings}
            todayCount={historyOrders.length}
          />
        )}
      </div>

      {/* ── Bottom refresh button ──────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 shadow-xl z-20 p-3">
        <button onClick={refetch}
          className="w-full py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
          🔄 รีเฟรชงาน
        </button>
      </div>
    </div>
  )
}

// ── Active Order Card ─────────────────────────────────────────────────
function ActiveOrderCard({ order, expanded, onExpand, onUpdateStatus, onOpenMaps, updating }) {
  const meta     = STATUS_META[order.status] || STATUS_META["กำลังทำ"]
  const shortId  = order.id?.toString().slice(-6).toUpperCase()
  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""

  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map(i => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items) ? order.items.join(", ") : ""

  const isDelivering = order.status === "กำลังจัดส่ง"
  const isPending    = order.status === "กำลังทำ"

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
      ${isDelivering ? "border-orange-300 shadow-orange-100" : "border-gray-100"}`}>

      {/* Header row */}
      <div className={`${meta.bg} px-4 py-3 flex items-center justify-between`}
        onClick={onExpand}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot} ${isDelivering ? "animate-pulse" : ""}`} />
          <div>
            <p className="font-black text-gray-800 text-sm font-mono">#{shortId}</p>
            <p className="text-gray-400 text-[10px]">{createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${meta.badge} text-[11px] font-bold px-2.5 py-1 rounded-full`}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-gray-300 text-lg">{expanded ? "∧" : "∨"}</span>
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="px-4 py-3">
        <p className="text-gray-700 text-sm font-medium mb-1 truncate">{itemsText || "—"}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>📍 {order.address || "ไม่ระบุ"}</span>
          {order.total_price && <span className="text-orange-500 font-bold">฿{order.total_price}</span>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {/* Order detail */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <Row label="รายการ"     value={itemsText} />
            <Row label="ยอดรวม"    value={`${order.total_price || 0}฿`} />
            <Row label="ชำระเงิน"
              value={order.payment_method === "cash" ? "💵 เงินสด" : order.payment_method === "transfer" ? "🏦 โอนเงิน" : "📱 PromptPay"} />
            <Row label="ที่อยู่"   value={order.address || "—"} />
            {order.note && <Row label="หมายเหตุ" value={order.note} />}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* นำทาง */}
            <button onClick={() => onOpenMaps(order)}
              className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1">
              🗺️ นำทาง
            </button>

            {/* Action หลัก */}
            {isPending && (
              <button
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, "กำลังจัดส่ง")}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                {updating ? "..." : "🛵 รับงานนี้"}
              </button>
            )}

            {isDelivering && (
              <button
                disabled={updating}
                onClick={() => onUpdateStatus(order.id, "ส่งสำเร็จ")}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                {updating ? "..." : "✅ ส่งสำเร็จ"}
              </button>
            )}
          </div>

          {/* เบอร์ลูกค้า (ถ้าต้องการเพิ่มใน schema ทีหลัง) */}
          <p className="text-center text-gray-300 text-[10px]">
            order ID: {order.id}
          </p>
        </div>
      )}
    </div>
  )
}

// ── History Card ──────────────────────────────────────────────────────
function HistoryCard({ order }) {
  const shortId   = order.id?.toString().slice(-6).toUpperCase()
  const updatedAt = order.updated_at
    ? new Date(order.updated_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""
  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map(i => `${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items) ? order.items.join(", ") : ""

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">✅</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-black text-gray-800 text-sm font-mono">#{shortId}</span>
          <span className="text-green-600 font-bold text-sm">+{order.delivery_fee || 25}฿</span>
        </div>
        <p className="text-gray-400 text-xs truncate">{itemsText}</p>
        <p className="text-gray-300 text-[10px]">ส่งเสร็จ {updatedAt} · 📍 {order.address}</p>
      </div>
    </div>
  )
}

// ── Earnings Tab ──────────────────────────────────────────────────────
function EarningsTab({ todayEarnings, weekEarnings, todayCount }) {
  const avgPerTrip = todayCount > 0 ? Math.round(todayEarnings / todayCount) : 0

  return (
    <div className="space-y-4 pb-4">
      {/* Big number */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-center shadow-xl shadow-orange-200">
        <p className="text-orange-100 text-sm font-semibold mb-1">รายได้วันนี้</p>
        <p className="text-white text-5xl font-black">{todayEarnings}<span className="text-2xl ml-1">฿</span></p>
        <p className="text-orange-100 text-xs mt-2">{todayCount} ออเดอร์ · เฉลี่ย {avgPerTrip}฿/ออเดอร์</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="สัปดาห์นี้"  value={`${weekEarnings}฿`}  icon="📅" color="text-indigo-600" />
        <StatCard label="ออเดอร์วันนี้" value={`${todayCount} งาน`} icon="📦" color="text-blue-600"   />
      </div>

      {/* Rate info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="font-bold text-gray-700 text-sm mb-3">💡 อัตราค่าตอบแทน</p>
        <div className="space-y-2">
          <Row label="ค่าส่งต่อออเดอร์" value="25฿" />
          <Row label="จ่ายเมื่อ"        value="ส่งสำเร็จทุกครั้ง" />
          <Row label="สรุปรายได้"       value="ทุกวัน 20:00 น." />
        </div>
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────
function SummaryCard({ icon, label, value, color }) {
  return (
    <div className={`${color} rounded-2xl p-3 text-center`}>
      <p className="text-lg leading-none">{icon}</p>
      <p className="font-black text-xl mt-1">{value}</p>
      <p className="text-[11px] opacity-80 mt-0.5">{label}</p>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`font-black text-xl ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400 text-xs flex-shrink-0">{label}</span>
      <span className="text-gray-700 text-xs font-medium text-right">{value}</span>
    </div>
  )
}