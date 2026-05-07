// src/components/rider/OrderCard.jsx

const STATUS_META = {
  "กำลังทำ":      { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",   icon: "👨‍🍳", label: "รอรับออเดอร์" },
  "กำลังจัดส่ง": { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", icon: "🛵", label: "กำลังส่ง"     },
  "ส่งสำเร็จ":   { bg: "bg-green-50",  badge: "bg-green-100 text-green-700",   dot: "bg-green-500",  icon: "✅", label: "ส่งสำเร็จ"    },
}

export function RiderOrderCard({ order, mode, expanded, onExpand, onAction, onOpenMaps, updating }) {
  const meta    = STATUS_META[order.status] || STATUS_META["กำลังทำ"]
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const timeStr = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""
  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map((i) => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items) ? order.items.join(", ") : ""
  const isDelivering = order.status === "กำลังจัดส่ง"

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isDelivering ? "border-orange-300 shadow-orange-100" : "border-gray-100"}`}>
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
            <InfoRow label="รายการ"   value={itemsText || "—"} />
            <InfoRow label="ยอดรวม"  value={`${order.total_price || 0}฿`} />
            <InfoRow label="ที่อยู่" value={order.address || "—"} />
            {order.note && <InfoRow label="หมายเหตุ" value={order.note} />}
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenMaps} className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-bold active:scale-95 transition-all">
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

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400 text-xs shrink-0">{label}</span>
      <span className="text-gray-700 text-xs font-medium text-right">{value}</span>
    </div>
  )
}