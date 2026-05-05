import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const MENU_ITEMS = [
  { id: 1, name: "ข้าวมันไก่", price: 50, emoji: "🍗", desc: "ไก่ต้มนุ่ม น้ำซุปหอม", popular: true },
  { id: 2, name: "ข้าวหมูแดง", price: 55, emoji: "🍖", desc: "หมูแดงหวานกลมกล่อม", popular: false },
  { id: 3, name: "ผัดไทย", price: 60, emoji: "🍜", desc: "เส้นหนาผัดไฟแรง", popular: true },
  { id: 4, name: "ส้มตำ", price: 45, emoji: "🌶️", desc: "เผ็ดหอมมะนาว", popular: false },
  { id: 5, name: "ข้าวผัดกระเพรา", price: 55, emoji: "🌿", desc: "กระเพราหมูสับไข่ดาว", popular: true },
  { id: 6, name: "ต้มยำกุ้ง", price: 80, emoji: "🦐", desc: "ต้มยำน้ำข้นรสจัด", popular: false },
]

const STATUS_STEPS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]

const STATUS_META = {
  "รอร้านยืนยัน": { color: "text-amber-500", bg: "bg-amber-50", bar: "bg-amber-400", icon: "⏳", badge: "bg-amber-100 text-amber-600" },
  "กำลังทำ":      { color: "text-blue-500",  bg: "bg-blue-50",  bar: "bg-blue-400",  icon: "👨‍🍳", badge: "bg-blue-100 text-blue-600" },
  "กำลังจัดส่ง": { color: "text-purple-500", bg: "bg-purple-50",bar: "bg-purple-400",icon: "🛵", badge: "bg-purple-100 text-purple-600" },
  "ส่งสำเร็จ":   { color: "text-green-500",  bg: "bg-green-50", bar: "bg-green-400", icon: "✅", badge: "bg-green-100 text-green-600" },
}

export default function OrderForm({ profile }) {
  const [quantities, setQuantities] = useState({})
  const [address, setAddress] = useState("")
  const [note, setNote] = useState("")
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [myOrders, setMyOrders] = useState([])
  const [tab, setTab] = useState("order")

  const fetchMyOrders = async () => {
    if (!profile?.userId) return
    try {
      const res = await fetch(`${API_URL}/orders`)
      const all = await res.json()
      setMyOrders(all.filter((o) => o.user_id === profile.userId).reverse())
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchMyOrders()
    const interval = setInterval(fetchMyOrders, 10000)
    return () => clearInterval(interval)
  }, [profile])

  const setQty = (id, delta) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
  }

  const selectedItems = MENU_ITEMS.filter((i) => (quantities[i.id] || 0) > 0)
  const total = selectedItems.reduce((sum, i) => sum + i.price * (quantities[i.id] || 0), 0)
  const itemCount = selectedItems.reduce((sum, i) => sum + (quantities[i.id] || 0), 0)

  const getLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false) },
      () => { alert("ไม่สามารถดึง GPS ได้ กรุณาอนุญาต Location"); setLocLoading(false) }
    )
  }

  const submit = async () => {
    if (!selectedItems.length) return alert("กรุณาเลือกสินค้า")
    if (!address) return alert("กรุณาใส่ที่อยู่")
    if (!location) return alert("กรุณากดดึง GPS ก่อน")
    setSubmitting(true)
    try {
      const itemNames = selectedItems.flatMap((i) => Array(quantities[i.id]).fill(i.name))
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile?.userId || "guest", items: itemNames, lat: location.lat, lng: location.lng, address, note }),
      })
      const data = await res.json()
      setCompletedOrder(data.order_id)
      fetchMyOrders()
    } catch (e) { alert("เกิดข้อผิดพลาด: " + e.message) }
    setSubmitting(false)
  }

  // ── Success Screen ──────────────────────────────────────────────
  if (completedOrder) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl mb-5 shadow-inner">
        🎉
      </div>
      <h2 className="text-gray-900 text-2xl font-bold mb-1">สั่งสำเร็จแล้ว!</h2>
      <p className="text-gray-400 text-sm mb-6">ร้านค้ากำลังยืนยันออเดอร์ของคุณ</p>

      <div className="w-full bg-white rounded-2xl border border-blue-100 p-5 mb-6 text-left shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">เลขออเดอร์</span>
          <span className="text-blue-600 font-bold text-sm">{completedOrder}</span>
        </div>
        {selectedItems.map((i) => (
          <div key={i.id} className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-50 last:border-0">
            <span>{i.emoji} {i.name} × {quantities[i.id]}</span>
            <span className="font-medium">{i.price * quantities[i.id]} ฿</span>
          </div>
        ))}
        <div className="flex justify-between mt-3 pt-3 border-t border-dashed border-blue-100">
          <span className="font-bold text-gray-700">ยอดรวม</span>
          <span className="font-bold text-blue-600 text-lg">{total} ฿</span>
        </div>
      </div>

      <button
        onClick={() => { setCompletedOrder(null); setQuantities({}); setAddress(""); setNote(""); setTab("tracking") }}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-200 mb-3 active:scale-98 transition-transform"
      >
        📦 ติดตามออเดอร์
      </button>
      <button
        onClick={() => { setCompletedOrder(null); setQuantities({}); setAddress(""); setNote("") }}
        className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold text-base border-2 border-blue-200 active:scale-98 transition-transform"
      >
        + สั่งเพิ่ม
      </button>
    </div>
  )

  // ── Main Form ───────────────────────────────────────────────────
  return (
    <div className="pb-28">

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-gray-100 sticky top-[52px] z-10 shadow-sm">
        {[
          { key: "order", label: "สั่งสินค้า", icon: "🛍️" },
          { key: "tracking", label: `ติดตาม${myOrders.length > 0 ? ` (${myOrders.length})` : ""}`, icon: "📦" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
              ${tab === t.key
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-400 border-b-2 border-transparent"
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ORDER TAB ── */}
      {tab === "order" && (
        <div>
          {/* Profile Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-lg shadow">
              {profile?.displayName?.[0] || "U"}
            </div>
            <div>
              <p className="text-blue-100 text-xs">ยินดีต้อนรับ</p>
              <p className="text-white font-bold text-base">{profile?.displayName || "ลูกค้า"}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-blue-100 text-xs">ฟรีค่าส่ง</p>
              <p className="text-white font-bold text-sm">🎁 วันนี้!</p>
            </div>
          </div>

          {/* Section: Menu */}
          <div className="px-4 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-800 font-bold text-base">🍽️ เมนูวันนี้</h2>
              <span className="text-gray-400 text-xs">{MENU_ITEMS.length} รายการ</span>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {MENU_ITEMS.map((item) => {
                const qty = quantities[item.id] || 0
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-3.5 flex items-center gap-3 transition-all duration-150 shadow-sm
                      ${qty > 0 ? "border-2 border-blue-400 shadow-blue-100" : "border border-gray-100"}`}
                  >
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                        {item.popular && (
                          <span className="bg-red-50 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                      <p className="text-blue-600 font-bold text-sm mt-1">{item.price} ฿</p>
                    </div>
                    {/* Qty Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 && (
                        <>
                          <button
                            onClick={() => setQty(item.id, -1)}
                            className="w-7 h-7 rounded-full border-2 border-red-400 text-red-400 font-bold text-lg flex items-center justify-center leading-none active:scale-90 transition-transform"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-gray-700 text-sm">{qty}</span>
                        </>
                      )}
                      <button
                        onClick={() => setQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center leading-none active:scale-90 transition-transform shadow"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Divider */}
            <div className="h-2 bg-gray-100 -mx-4 mb-5 rounded-full" />

            {/* Section: Delivery */}
            <h2 className="text-gray-800 font-bold text-base mb-3">📍 รายละเอียดจัดส่ง</h2>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ที่อยู่จัดส่ง</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="บ้านเลขที่, ซอย, ถนน, แขวง, เขต..."
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300
                         focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none mb-3 font-[inherit]"
            />

            <button
              onClick={getLocation}
              disabled={locLoading}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-3
                ${location
                  ? "bg-green-50 text-green-600 border-2 border-green-200"
                  : "bg-blue-50 text-blue-600 border-2 border-blue-200 hover:bg-blue-100"
                } ${locLoading ? "opacity-60" : ""}`}
            >
              {locLoading ? (
                <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> กำลังดึง GPS...</>
              ) : location ? (
                <>✅ GPS พร้อมแล้ว · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</>
              ) : (
                <>📡 ดึงตำแหน่ง GPS</>
              )}
            </button>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">หมายเหตุ (ถ้ามี)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผักชี, ฝากไว้หน้าบ้าน"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300
                         focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-5 font-[inherit]"
            />

            {/* Order Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-5">
                <p className="text-blue-700 font-bold text-sm mb-3 flex items-center gap-1.5">
                  🧾 สรุปออเดอร์
                  <span className="bg-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">{itemCount} ชิ้น</span>
                </p>
                {selectedItems.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm text-gray-600 py-1">
                    <span className="flex items-center gap-1">{i.emoji} {i.name} <span className="text-gray-400">×{quantities[i.id]}</span></span>
                    <span className="font-semibold text-gray-700">{i.price * quantities[i.id]} ฿</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-blue-200 mt-3 pt-3 flex justify-between">
                  <span className="font-bold text-gray-700">รวมทั้งหมด</span>
                  <span className="font-bold text-blue-600 text-lg">{total} ฿</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRACKING TAB ── */}
      {tab === "tracking" && (
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-800 font-bold text-base">ออเดอร์ของฉัน</h2>
            <button
              onClick={fetchMyOrders}
              className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              🔄 รีเฟรช
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400 mb-5">ยังไม่มีออเดอร์</p>
              <button
                onClick={() => setTab("order")}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
              >
                สั่งสินค้าเลย
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myOrders.map((order) => (
                <OrderCard key={order.order_id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Floating Submit Button ── */}
      {tab === "order" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-2xl max-w-md mx-auto">
          <button
            onClick={submit}
            disabled={submitting || !selectedItems.length}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200
              ${selectedItems.length && !submitting
                ? "bg-blue-600 text-white shadow-lg shadow-blue-300 active:scale-98"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังส่งออเดอร์...</span>
              : selectedItems.length
              ? `🛍️ สั่งเลย · ${itemCount} ชิ้น · ${total} ฿`
              : "กรุณาเลือกสินค้า"
            }
          </button>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }) {
  const meta = STATUS_META[order.status] || { color: "text-gray-500", bg: "bg-gray-50", bar: "bg-gray-300", icon: "📦", badge: "bg-gray-100 text-gray-500" }
  const stepIdx = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className={`${meta.bg} px-4 py-3 flex items-center justify-between`}>
        <div>
          <p className="text-gray-400 text-xs">เลขออเดอร์</p>
          <p className="text-gray-800 font-bold text-sm">{order.order_id}</p>
        </div>
        <span className={`${meta.badge} text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1`}>
          {meta.icon} {order.status}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3">
        <p className="text-gray-700 text-sm font-medium mb-1">
          {[...new Set(order.items)].map((item) => {
            const count = order.items.filter((i) => i === item).length
            return count > 1 ? `${item} ×${count}` : item
          }).join(", ")}
        </p>
        <p className="text-gray-400 text-xs mb-3">📍 {order.address}{order.note && ` · 💬 ${order.note}`}</p>

        {/* Progress Steps */}
        <div className="flex gap-1.5 mb-2">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${i <= stepIdx ? meta.bar : "bg-gray-100"}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {STATUS_STEPS.map((s, i) => (
            <span key={s} className={`text-[9px] ${i === stepIdx ? meta.color + " font-bold" : "text-gray-300"}`}>
              {i === 0 ? "รอยืนยัน" : i === 1 ? "กำลังทำ" : i === 2 ? "จัดส่ง" : "สำเร็จ"}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}