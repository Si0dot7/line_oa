// src/components/order/DeliveryStep.jsx

const PAYMENT_METHODS = [
  { id: "cash",      icon: "💵", label: "เงินสด"   },
  { id: "transfer",  icon: "🏦", label: "โอนเงิน"  },
  { id: "promptpay", icon: "📱", label: "PromptPay" },
]

export function DeliveryStep({
  address, setAddress,
  note, setNote,
  location, locLoading, onGetLocation,
  paymentMethod, setPaymentMethod,
  points, subtotal, deliveryFee, pointsDiscount, total,
  usePointsRedemption, setUsePointsRedemption,
  selectedItems, quantities,
  savedAddresses,
  submitting, onSubmit, onBack,
}) {
  return (
    <div className="px-4 pt-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold mb-5">
        ‹ กลับไปเมนู
      </button>
      <h2 className="font-black text-gray-800 text-lg mb-4">📍 ที่อยู่จัดส่ง</h2>

      {/* Quick picks */}
      {savedAddresses.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">ที่อยู่ที่ใช้บ่อย</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {savedAddresses.map((a, i) => (
              <button key={i} onClick={() => setAddress(a.address)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs border transition-all
                  ${address === a.address ? "border-blue-500 bg-blue-50 text-blue-600 font-bold" : "border-gray-200 bg-white text-gray-600"}`}>
                📍 {a.address.length > 20 ? a.address.slice(0, 20) + "..." : a.address}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
        placeholder="ระบุที่อยู่จัดส่ง เช่น บ้านเลขที่, ซอย, ถนน, แขวง..."
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-[inherit] mb-3" />

      <button onClick={onGetLocation} disabled={locLoading}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-3 border-2
          ${location ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 border-blue-200"}
          ${locLoading ? "opacity-60" : "active:scale-95"}`}>
        {locLoading
          ? <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> กำลังดึง GPS...</>
          : location
          ? <>✅ GPS พร้อม · {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · แตะเพื่ออัปเดต</>
          : <>📡 ดึงตำแหน่ง GPS (จำเป็น)</>
        }
      </button>

      <input value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="💬 หมายเหตุ เช่น ไม่ใส่ผักชี, ฝากไว้หน้าบ้าน"
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-4 font-[inherit]" />

      {/* Payment */}
      <p className="text-gray-700 font-bold text-sm mb-2">💳 วิธีชำระเงิน</p>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PAYMENT_METHODS.map((m) => (
          <button key={m.id} onClick={() => setPaymentMethod(m.id)}
            className={`py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1
              ${paymentMethod === m.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500"}`}>
            <span className="text-xl">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Points Redemption */}
      {points > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-bold text-amber-700 text-sm">แต้มสะสม {points} แต้ม</p>
              <p className="text-amber-500 text-xs">ใช้ได้สูงสุด {Math.floor(subtotal * 0.1)}฿</p>
            </div>
          </div>
          <button onClick={() => setUsePointsRedemption(!usePointsRedemption)}
            className={`w-12 h-6 rounded-full transition-all relative ${usePointsRedemption ? "bg-amber-500" : "bg-gray-300"}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${usePointsRedemption ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-5">
        <p className="font-bold text-blue-700 text-sm mb-3">🧾 สรุปออเดอร์</p>
        {selectedItems.map((i) => (
          <div key={i.id} className="flex justify-between text-sm text-gray-600 py-1">
            <span>{i.emoji} {i.name} ×{quantities[i.id]}</span>
            <span className="font-semibold">{i.price * quantities[i.id]}฿</span>
          </div>
        ))}
        <div className="border-t border-dashed border-blue-200 mt-2 pt-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-500"><span>ค่าอาหาร</span><span>{subtotal}฿</span></div>
          <div className={`flex justify-between text-xs ${deliveryFee === 0 ? "text-green-500" : "text-gray-500"}`}>
            <span>ค่าจัดส่ง {deliveryFee === 0 ? "🎁 ฟรี!" : ""}</span><span>{deliveryFee}฿</span>
          </div>
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-500"><span>⭐ ใช้แต้ม</span><span>-{pointsDiscount}฿</span></div>
          )}
          <div className="flex justify-between font-black text-base text-gray-800 pt-1 border-t border-blue-200">
            <span>รวมทั้งหมด</span><span className="text-blue-600">{total}฿</span>
          </div>
        </div>
      </div>

      <button onClick={onSubmit} disabled={submitting}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${!submitting ? "bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95" : "bg-blue-400 text-white"}`}>
        {submitting
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังส่งออเดอร์...
            </span>
          : `🛍️ ยืนยันสั่งซื้อ · ${total}฿`
        }
      </button>
    </div>
  )
}