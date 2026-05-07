// src/components/merchant/OrdersTab.jsx
import { useState } from "react"
import { STATUS_OPTIONS, STATUS_META, NEXT_STATUS, NEXT_LABEL } from "../../constants/orderStatus"

export function OrdersTab({ orders, loading, onUpdateStatus, onRefetch }) {
  const [filterStatus, setFilterStatus] = useState("รอร้านยืนยัน")
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length
    return acc
  }, {})

  const filteredOrders = filterStatus === "ทั้งหมด" ? orders : orders.filter((o) => o.status === filterStatus)

  const handleUpdate = async (orderId, status) => {
    setUpdatingId(orderId)
    await onUpdateStatus(orderId, status)
    setUpdatingId(null)
  }

  const openMap = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-2 bg-white border-b border-gray-100">
        {["ทั้งหมด", ...STATUS_OPTIONS].map((s) => {
          const m = s !== "ทั้งหมด" ? STATUS_META[s] : null
          const count = s === "ทั้งหมด" ? orders.length : stats[s]
          const isActive = filterStatus === s
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1
                ${isActive
                  ? s === "ทั้งหมด" ? "bg-indigo-600 text-white shadow-md" : `${m.btnBg} text-white shadow-md`
                  : "bg-gray-100 text-gray-500"
                }`}
            >
              {m?.icon || "📋"} {s === "ทั้งหมด" ? "ทั้งหมด" : s.replace("รอร้านยืนยัน", "รอยืนยัน").replace("กำลังจัดส่ง", "จัดส่ง")}
              {count > 0 && (
                <span className={`${isActive ? "bg-white bg-opacity-30" : "bg-gray-300"} rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-gray-600 font-semibold text-sm">
          {filterStatus === "ทั้งหมด" ? `ทั้งหมด ${orders.length} รายการ` : `${filterStatus} · ${filteredOrders.length}`}
        </span>
        <button onClick={onRefetch} className="text-indigo-600 text-sm font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 active:scale-95 transition-all">
          🔄 รีเฟรช
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400 font-medium">ไม่มีออเดอร์ใน "{filterStatus}"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {filteredOrders.map((order) => (
            <MerchantOrderCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              isExpanded={expandedId === order.id}
              onExpand={() => setExpandedId(expandedId === order.id ? null : order.id)}
              onUpdateStatus={(status) => handleUpdate(order.id, status)}
              onOpenMap={() => openMap(order.lat, order.lng)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MerchantOrderCard({ order, isUpdating, isExpanded, onExpand, onUpdateStatus, onOpenMap }) {
  const m = STATUS_META[order.status] || STATUS_META["รอร้านยืนยัน"]
  const nextStatus = NEXT_STATUS[order.status]
  const nextLabel  = NEXT_LABEL[order.status]
  const shortId    = order.id?.toString().slice(-6).toUpperCase()
  const createdAt  = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""

  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map((i) => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(" · ")
    : Array.isArray(order.items)
    ? [...new Set(order.items)].map((item) => {
        const c = order.items.filter((x) => x === item).length
        return c > 1 ? `${item} ×${c}` : item
      }).join(", ")
    : order.items

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 border ${m.border} ${isUpdating ? "opacity-60 scale-98" : ""}`}>
      <div className={`${m.bg} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${m.dot} ${order.status !== "ส่งสำเร็จ" ? "animate-pulse" : ""}`} />
          <span className="text-gray-500 text-xs font-mono">#{shortId} · {createdAt}</span>
        </div>
        <span className={`${m.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>{m.icon} {order.status}</span>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500 text-xs">👤 {order.display_name || "ลูกค้า"}</span>
          {order.total_price && <span className="font-black text-blue-600">{order.total_price}฿</span>}
        </div>
        <p className="text-gray-800 font-semibold text-sm mb-1">{itemsText}</p>
        <p className="text-gray-400 text-xs mb-1 flex items-start gap-1">
          <span className="mt-0.5">📍</span><span>{order.address}</span>
        </p>
        {order.payment_method && (
          <p className="text-gray-400 text-xs mb-1">
            💳 {order.payment_method === "cash" ? "เงินสด" : order.payment_method === "transfer" ? "โอนเงิน" : "PromptPay"}
          </p>
        )}
        {order.note && (
          <p className="text-amber-600 text-xs mb-3 bg-amber-50 px-2.5 py-1.5 rounded-lg">💬 {order.note}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onOpenMap} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5">
            🗺️ แผนที่
          </button>
          {nextStatus && (
            <button onClick={() => onUpdateStatus(nextStatus)} disabled={isUpdating}
              className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white ${m.btnBg} active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50`}>
              {isUpdating
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> อัปเดต...</>
                : nextLabel
              }
            </button>
          )}
          <button onClick={onExpand} className="w-10 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center">
            {isExpanded ? "▲" : "▾"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">เปลี่ยนสถานะ</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.filter((s) => s !== order.status).map((s) => {
                const sm = STATUS_META[s]
                return (
                  <button key={s} onClick={() => { onUpdateStatus(s); }} disabled={isUpdating}
                    className={`py-2 rounded-xl text-xs font-bold ${sm.badge} border ${sm.border} active:scale-95 transition-all flex items-center justify-center gap-1`}>
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
}