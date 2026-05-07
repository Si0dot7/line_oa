// src/components/rider/HistoryCard.jsx

export function HistoryCard({ order }) {
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const timeStr = order.updated_at
    ? new Date(order.updated_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : ""
  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map((i) => `${i.name} ×${i.qty}`).join(", ")
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