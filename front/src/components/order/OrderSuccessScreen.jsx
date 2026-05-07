// src/components/order/OrderSuccessScreen.jsx

export function OrderSuccessScreen({ order, total, deliveryFee, subtotal, onTrack, onOrderAgain }) {
  const shortId = order.id?.toString().slice(-6).toUpperCase()
  const earnedPoints = Math.floor(subtotal / 10)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-green-400 to-green-600 py-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg mb-3 animate-bounce">✅</div>
          <p className="text-white font-black text-2xl">ส่งออเดอร์แล้ว!</p>
          <p className="text-green-100 text-sm mt-1">ร้านค้าจะยืนยันในไม่ช้า</p>
        </div>

        <div className="p-5">
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 text-sm">เลขออเดอร์</span>
              <span className="font-black text-lg text-gray-800 font-mono">#{shortId}</span>
            </div>
            <div className="space-y-1.5 mb-3">
              {order.items_detail?.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.emoji} {i.name} ×{i.qty}</span>
                  <span className="font-semibold text-gray-800">{i.price * i.qty}฿</span>
                </div>
              ))}
            </div>
            {deliveryFee === 0 ? (
              <div className="flex justify-between text-sm text-green-500 border-t border-dashed pt-2 mb-1">
                <span>🎁 ฟรีค่าส่ง</span><span>0฿</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-gray-500 border-t border-dashed pt-2 mb-1">
                <span>ค่าจัดส่ง</span><span>{deliveryFee}฿</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>รวม</span><span className="text-blue-600">{total}฿</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="text-amber-700 font-bold text-sm">ได้รับ {earnedPoints} แต้ม!</p>
              <p className="text-amber-500 text-xs">ใช้แต้มแลกส่วนลดครั้งต่อไป</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onTrack} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-200">
              📦 ติดตามออเดอร์
            </button>
            <button onClick={onOrderAgain} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95 transition-all">
              🛍️ สั่งอีก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}