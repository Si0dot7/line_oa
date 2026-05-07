// src/components/merchant/DealsTab.jsx

export function DealsTab({ deals, onCreateDeal, onRemoveDeal }) {
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-black text-gray-800 text-lg">⚡ Flash Deals</h2>
          <p className="text-gray-400 text-xs">โปรโมชั่นพิเศษระยะเวลาจำกัด</p>
        </div>
        <button onClick={onCreateDeal} className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition-all">
          ⚡ สร้าง Deal
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <p className="text-gray-400 font-medium mb-2">ยังไม่มี Flash Deal</p>
          <p className="text-gray-300 text-sm mb-5">สร้าง Deal เพื่อดึงดูดลูกค้า</p>
          <button onClick={onCreateDeal} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95">
            สร้าง Deal แรก
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {deals.map((deal) => {
            const now = Date.now()
            const isActive = deal.is_active && new Date(deal.start_at) <= now && new Date(deal.end_at) >= now
            const isExpired = new Date(deal.end_at) < now
            const fmtDate = (d) => new Date(d).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            return (
              <div key={deal.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isActive ? "border-orange-200" : "border-gray-100 opacity-60"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{deal.menu_items?.emoji || "🍽️"}</span>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{deal.menu_items?.name}</p>
                      <p className="text-orange-500 font-black text-lg">-{deal.discount_percent}%</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isActive ? "bg-green-100 text-green-600" : isExpired ? "bg-gray-100 text-gray-400" : "bg-yellow-100 text-yellow-600"}`}>
                    {isActive ? "🟢 Active" : isExpired ? "หมดเวลา" : "รอเวลา"}
                  </span>
                </div>
                <div className="text-gray-400 text-xs mb-3">{fmtDate(deal.start_at)} — {fmtDate(deal.end_at)}</div>
                <button onClick={() => onRemoveDeal(deal.id)} className="w-full py-2 bg-red-50 text-red-400 text-xs font-semibold rounded-xl border border-red-100 active:scale-95 transition-all">
                  ❌ ปิด Deal นี้
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}