// src/components/order/OrderCard.jsx
import { STATUS_META, STATUS_STEPS } from "../../constants/orderStatus"

export function OrderCard({ order, onReorder }) {
  const meta    = STATUS_META[order.status] || { color: "text-gray-500", bg: "bg-gray-50", bar: "bg-gray-300", icon: "📦", badge: "bg-gray-100 text-gray-500" }
  const stepIdx = STATUS_STEPS.indexOf(order.status)
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : ""

  const itemsText = Array.isArray(order.items_detail)
    ? order.items_detail.map((i) => `${i.emoji || ""} ${i.name} ×${i.qty}`).join(", ")
    : Array.isArray(order.items)
    ? [...new Set(order.items)].map((item) => {
        const c = order.items.filter((x) => x === item).length
        return c > 1 ? `${item} ×${c}` : item
      }).join(", ")
    : order.items

  const paymentLabel = order.payment_method === "cash" ? "เงินสด" : order.payment_method === "transfer" ? "โอนเงิน" : "PromptPay"

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
        <p className="text-gray-700 text-sm font-medium mb-1">{itemsText}</p>
        {order.total_price && (
          <p className="text-blue-600 font-bold text-sm mb-1">
            {order.total_price}฿
            {order.payment_method && (
              <span className="text-gray-400 font-normal ml-2 text-xs">· {paymentLabel}</span>
            )}
          </p>
        )}
        <p className="text-gray-400 text-xs mb-3">
          📍 {order.address}{order.note ? ` · 💬 ${order.note}` : ""}
        </p>

        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-1">
          {STATUS_STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${i <= stepIdx ? meta.bar : ""}`}
                style={{ width: i <= stepIdx ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mb-3">
          {["รอยืนยัน", "กำลังทำ", "จัดส่ง", "สำเร็จ"].map((s, i) => (
            <span key={s} className={`text-[9px] ${i === stepIdx ? meta.color + " font-bold" : "text-gray-300"}`}>
              {s}
            </span>
          ))}
        </div>

        {order.status === "ส่งสำเร็จ" && (
          <button onClick={onReorder} className="w-full py-2.5 bg-blue-50 border border-blue-200 text-blue-600 font-semibold text-sm rounded-xl active:scale-95 transition-all">
            🔄 สั่งซ้ำออเดอร์นี้
          </button>
        )}
      </div>
    </div>
  )
}