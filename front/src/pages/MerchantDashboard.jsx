import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_OPTIONS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]

const STATUS_META = {
  "รอร้านยืนยัน": {
    color: "text-amber-600", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700",
    border: "border-amber-300", bar: "bg-amber-400",
    btnBg: "bg-amber-500 hover:bg-amber-600", icon: "⏳", dot: "bg-amber-400",
  },
  "กำลังทำ": {
    color: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700",
    border: "border-blue-300", bar: "bg-blue-500",
    btnBg: "bg-blue-600 hover:bg-blue-700", icon: "👨‍🍳", dot: "bg-blue-500",
  },
  "กำลังจัดส่ง": {
    color: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700",
    border: "border-purple-300", bar: "bg-purple-500",
    btnBg: "bg-purple-600 hover:bg-purple-700", icon: "🛵", dot: "bg-purple-500",
  },
  "ส่งสำเร็จ": {
    color: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-700",
    border: "border-green-300", bar: "bg-green-500",
    btnBg: "bg-green-600 hover:bg-green-700", icon: "✅", dot: "bg-green-500",
  },
}

// Next status mapping for quick action
const NEXT_STATUS = {
  "รอร้านยืนยัน": "กำลังทำ",
  "กำลังทำ": "กำลังจัดส่ง",
  "กำลังจัดส่ง": "ส่งสำเร็จ",
  "ส่งสำเร็จ": null,
}

const NEXT_LABEL = {
  "รอร้านยืนยัน": "✅ ยืนยันออเดอร์",
  "กำลังทำ": "🛵 ส่งออก",
  "กำลังจัดส่ง": "✅ ส่งสำเร็จ",
}

export default function MerchantDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("รอร้านยืนยัน")
  const [updatingId, setUpdatingId] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      setOrders(data.reverse())
      setLastUpdate(new Date())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId)
    try {
      await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await fetchOrders()
    } catch (e) { alert("อัปเดตไม่สำเร็จ: " + e.message) }
    setUpdatingId(null)
  }

  const openMap = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")

  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length
    return acc
  }, {})

  const pendingCount = stats["รอร้านยืนยัน"]
  const filteredOrders = filterStatus === "ทั้งหมด"
    ? orders
    : orders.filter((o) => o.status === filterStatus)

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">กำลังโหลดออเดอร์...</p>
    </div>
  )

  return (
    <div className="pb-6">

      {/* Merchant Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs mb-0.5">แดชบอร์ดร้านค้า</p>
            <p className="text-white font-bold text-lg">จัดการออเดอร์ 📋</p>
          </div>
          <div className="text-right">
            {pendingCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                🔔 {pendingCount} ใหม่!
              </div>
            )}
            {lastUpdate && (
              <p className="text-indigo-200 text-[10px] mt-1">อัปเดต {lastUpdate.toLocaleTimeString("th-TH")}</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {STATUS_OPTIONS.map((s) => {
            const m = STATUS_META[s]
            return (
              <div key={s} className="bg-white bg-opacity-15 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-xl leading-none">{stats[s]}</p>
                <p className="text-indigo-100 text-[9px] mt-1 leading-tight">{m.icon}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[52px] z-10">
        <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-2">
          {["ทั้งหมด", ...STATUS_OPTIONS].map((s) => {
            const m = s !== "ทั้งหมด" ? STATUS_META[s] : null
            const count = s === "ทั้งหมด" ? orders.length : stats[s]
            const isActive = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1
                  ${isActive
                    ? s === "ทั้งหมด"
                      ? "bg-indigo-600 text-white shadow-md"
                      : `${m.btnBg} text-white shadow-md`
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {m?.icon || "📋"} {s === "ทั้งหมด" ? "ทั้งหมด" : s.replace("รอร้านยืนยัน", "รอยืนยัน").replace("กำลังจัดส่ง","จัดส่ง")}
                {count > 0 && (
                  <span className={`${isActive ? "bg-white bg-opacity-30" : "bg-gray-300"} text-inherit rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-gray-600 font-semibold text-sm">
          {filterStatus === "ทั้งหมด" ? `ทั้งหมด ${orders.length} รายการ` : `${filterStatus} · ${filteredOrders.length} รายการ`}
        </span>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95"
        >
          🔄 รีเฟรช
        </button>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400 font-medium">ไม่มีออเดอร์ใน "{filterStatus}"</p>
          <p className="text-gray-300 text-sm mt-1">ออเดอร์ใหม่จะปรากฏที่นี่</p>
        </div>
      )}

      {/* Order Cards */}
      <div className="flex flex-col gap-3 px-4">
        {filteredOrders.map((order) => {
          const m = STATUS_META[order.status] || STATUS_META["รอร้านยืนยัน"]
          const isUpdating = updatingId === order.order_id
          const isExpanded = expandedId === order.order_id
          const nextStatus = NEXT_STATUS[order.status]
          const nextLabel = NEXT_LABEL[order.status]

          return (
            <div
              key={order.order_id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200
                ${isUpdating ? "opacity-60 scale-98" : ""}
                ${m.border} border`}
            >
              {/* Status Strip */}
              <div className={`${m.bg} px-4 py-2.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.dot} ${order.status !== "ส่งสำเร็จ" ? "animate-pulse" : ""}`} />
                  <span className="text-gray-500 text-xs font-mono">{order.order_id}</span>
                </div>
                <span className={`${m.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>
                  {m.icon} {order.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3">
                {/* Items */}
                <p className="text-gray-800 font-semibold text-sm mb-1">
                  {[...new Set(order.items)].map((item) => {
                    const count = order.items.filter((i) => i === item).length
                    return count > 1 ? `${item} ×${count}` : item
                  }).join(", ")}
                </p>

                {/* Address */}
                <p className="text-gray-400 text-xs mb-3 flex items-start gap-1">
                  <span className="mt-0.5">📍</span>
                  <span>{order.address}</span>
                </p>
                {order.note && (
                  <p className="text-amber-600 text-xs mb-3 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                    💬 {order.note}
                  </p>
                )}

                {/* Action Row */}
                <div className="flex gap-2">
                  {/* Map Button */}
                  <button
                    onClick={() => openMap(order.lat, order.lng)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200
                               hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    🗺️ แผนที่
                  </button>

                  {/* Primary Action: Next Status */}
                  {nextStatus && (
                    <button
                      onClick={() => updateStatus(order.order_id, nextStatus)}
                      disabled={isUpdating}
                      className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white
                                 ${m.btnBg} active:scale-95 transition-all shadow-sm
                                 flex items-center justify-center gap-1.5 disabled:opacity-50`}
                    >
                      {isUpdating
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังอัปเดต...</>
                        : nextLabel
                      }
                    </button>
                  )}

                  {/* Expand for more options */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.order_id)}
                    className="w-10 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {isExpanded ? "▲" : "▾"}
                  </button>
                </div>

                {/* Expanded: All Status Options */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">เปลี่ยนสถานะเป็น</p>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_OPTIONS.filter((s) => s !== order.status).map((s) => {
                        const sm = STATUS_META[s]
                        return (
                          <button
                            key={s}
                            onClick={() => { updateStatus(order.order_id, s); setExpandedId(null) }}
                            disabled={isUpdating}
                            className={`py-2 rounded-xl text-xs font-bold ${sm.badge} border ${sm.border}
                                       active:scale-95 transition-all flex items-center justify-center gap-1`}
                          >
                            {sm.icon} {s.replace("รอร้านยืนยัน", "รอยืนยัน").replace("กำลังจัดส่ง", "จัดส่ง")}
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
    </div>
  )
}