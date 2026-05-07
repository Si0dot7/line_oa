// src/pages/RiderDashboard.jsx  (~130 บรรทัด จากเดิม 466)
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { useToast } from "../hooks/useToast"
import { Toast } from "../components/shared/Toast"
import { EmptyState, Spinner } from "../components/shared/EmptyState"
import { RiderOrderCard } from "../components/rider/OrderCard"
import { HistoryCard } from "../components/rider/HistoryCard"
import { EarningsTab } from "../components/rider/EarningsTab"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const TABS = [
  { id: "active",   label: "งานใหม่"  },
  { id: "mine",     label: "งานฉัน"   },
  { id: "history",  label: "ประวัติ"  },
  { id: "earnings", label: "รายได้"   },
]

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
  const { toast, showToast } = useToast()

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!riderId) { setLoading(false); return }
    setLoading(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7)

    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from("orders").select("*").eq("status", "กำลังทำ").is("rider_id", null).order("created_at", { ascending: true }).limit(30),
      supabase.from("orders").select("*").eq("status", "กำลังจัดส่ง").eq("rider_id", riderId).order("created_at", { ascending: true }).limit(20),
      supabase.from("orders").select("*").eq("status", "ส่งสำเร็จ").eq("rider_id", riderId).gte("updated_at", todayStart.toISOString()).order("updated_at", { ascending: false }).limit(30),
      supabase.from("orders").select("delivery_fee").eq("status", "ส่งสำเร็จ").eq("rider_id", riderId).gte("updated_at", todayStart.toISOString()),
      supabase.from("orders").select("delivery_fee").eq("status", "ส่งสำเร็จ").eq("rider_id", riderId).gte("updated_at", weekStart.toISOString()),
    ])

    setPendingOrders(r1.data || [])
    setMyOrders(r2.data || [])
    setHistoryOrders(r3.data || [])
    if (r4.data) { setTodayCount(r4.data.length); setTodayEarnings(r4.data.reduce((s, o) => s + (o.delivery_fee || 25), 0)) }
    if (r5.data) setWeekEarnings(r5.data.reduce((s, o) => s + (o.delivery_fee || 25), 0))
    setLoading(false)
  }, [riderId])

  // ── Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
    if (!riderId) return
    const ch = supabase.channel(`rider-rt-${riderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ({ eventType, new: updated }) => {
        if (eventType === "INSERT" && updated.status === "กำลังทำ" && !updated.rider_id) {
          setPendingOrders((prev) => prev.some((x) => x.id === updated.id) ? prev : [...prev, updated].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
        }
        if (eventType === "UPDATE") {
          if (updated.status === "กำลังจัดส่ง" && updated.rider_id !== riderId) {
            setPendingOrders((prev) => prev.filter((x) => x.id !== updated.id))
          }
          if (updated.status === "กำลังจัดส่ง" && updated.rider_id === riderId) {
            setPendingOrders((prev) => prev.filter((x) => x.id !== updated.id))
            setMyOrders((prev) => prev.some((x) => x.id === updated.id) ? prev.map((x) => x.id === updated.id ? updated : x) : [...prev, updated])
          }
          if (updated.status === "ส่งสำเร็จ" || updated.status === "ยกเลิก") {
            setPendingOrders((prev) => prev.filter((x) => x.id !== updated.id))
            setMyOrders((prev) => prev.filter((x) => x.id !== updated.id))
            if (updated.status === "ส่งสำเร็จ" && updated.rider_id === riderId) setHistoryOrders((prev) => [updated, ...prev])
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [riderId, fetchAll])

  // ── Accept order ───────────────────────────────────────────────
  const acceptOrder = async (order) => {
    if (updatingId) return
    setUpdatingId(order.id)
    setPendingOrders((prev) => prev.filter((x) => x.id !== order.id))
    setMyOrders((prev) => [...prev, { ...order, status: "กำลังจัดส่ง", rider_id: riderId }])
    try {
      const { data, error } = await supabase.from("orders")
        .update({ status: "กำลังจัดส่ง", rider_id: riderId, updated_at: new Date().toISOString() })
        .eq("id", order.id).eq("status", "กำลังทำ").is("rider_id", null)
        .select()
      if (error) throw error
      if (!data || data.length === 0) {
        setMyOrders((prev) => prev.filter((x) => x.id !== order.id))
        setPendingOrders((prev) => [...prev, order].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
        showToast("⚠️ ออเดอร์นี้ถูกรับไปแล้ว", "error")
        return
      }
      await fetch(`${API_URL}/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "กำลังจัดส่ง", user_id: order.user_id }) }).catch(() => {})
      showToast("🛵 รับงานแล้ว! มุ่งหน้าส่งเลย")
      setExpandedId(null)
      setTab("mine")
    } catch (e) {
      setMyOrders((prev) => prev.filter((x) => x.id !== order.id))
      setPendingOrders((prev) => [...prev, order].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      showToast("❌ " + (e.message || "เกิดข้อผิดพลาด"), "error")
    } finally { setUpdatingId(null) }
  }

  // ── Complete order ─────────────────────────────────────────────
  const completeOrder = async (order) => {
    if (updatingId) return
    setUpdatingId(order.id)
    setMyOrders((prev) => prev.filter((x) => x.id !== order.id))
    try {
      const { error } = await supabase.from("orders").update({ status: "ส่งสำเร็จ", updated_at: new Date().toISOString() }).eq("id", order.id).eq("rider_id", riderId)
      if (error) throw error
      const fee = order.delivery_fee || 25
      setTodayCount((c) => c + 1)
      setTodayEarnings((e) => e + fee)
      setWeekEarnings((e) => e + fee)
      setHistoryOrders((prev) => [{ ...order, status: "ส่งสำเร็จ" }, ...prev])
      await fetch(`${API_URL}/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ส่งสำเร็จ", user_id: order.user_id }) }).catch(() => {})
      showToast(`✅ ส่งสำเร็จ! +${fee}฿`)
      setExpandedId(null)
      setTab("history")
    } catch (e) {
      setMyOrders((prev) => [...prev, order])
      showToast("❌ " + (e.message || "เกิดข้อผิดพลาด"), "error")
    } finally { setUpdatingId(null) }
  }

  const openMaps = (order) => {
    const url = order.lat && order.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address || "")}`
    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Toast toast={toast} />

      {/* Stats Header */}
      <div className="bg-orange-500 px-4 pb-4 pt-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "รอรับ",     value: pendingOrders.length, bg: "bg-orange-400" },
            { label: "กำลังส่ง", value: myOrders.length,      bg: "bg-orange-600" },
            { label: "วันนี้",   value: `${todayEarnings}฿`,  bg: "bg-orange-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
              <div className="font-black text-white text-xl leading-none">{s.value}</div>
              <div className="text-orange-100 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        {TABS.map((t) => {
          const badge = t.id === "active" ? pendingOrders.length : t.id === "mine" ? myOrders.length : 0
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-bold relative transition-colors ${tab === t.id ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-400"}`}>
              {t.label}
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 translate-x-1/2 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel Content */}
      <div className="px-4 pt-4 space-y-3">
        {tab === "active" && (
          loading ? <Spinner color="orange" /> :
          pendingOrders.length === 0
            ? <EmptyState icon="🛵" title="ไม่มีงานใหม่" sub="รอออเดอร์เข้ามา..." />
            : pendingOrders.map((o) => (
                <RiderOrderCard key={o.id} order={o} mode="accept"
                  expanded={expandedId === o.id}
                  onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  onAction={() => acceptOrder(o)}
                  onOpenMaps={() => openMaps(o)}
                  updating={updatingId === o.id}
                />
              ))
        )}

        {tab === "mine" && (
          loading ? <Spinner color="orange" /> :
          myOrders.length === 0
            ? <EmptyState icon="📦" title="ยังไม่มีงานที่รับ" sub="ไปรับงานในแท็บ งานใหม่" />
            : myOrders.map((o) => (
                <RiderOrderCard key={o.id} order={o} mode="complete"
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
            ? <EmptyState icon="📋" title="ยังไม่มีประวัติวันนี้" sub="" />
            : historyOrders.map((o) => <HistoryCard key={o.id} order={o} />)
        )}

        {tab === "earnings" && (
          <EarningsTab todayEarnings={todayEarnings} weekEarnings={weekEarnings} todayCount={todayCount} />
        )}
      </div>

      <button onClick={fetchAll}
        className="fixed bottom-6 right-4 w-12 h-12 bg-orange-500 text-white rounded-full shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all z-30">
        🔄
      </button>
    </div>
  )
}