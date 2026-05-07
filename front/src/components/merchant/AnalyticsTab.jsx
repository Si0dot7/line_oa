// src/components/merchant/AnalyticsTab.jsx

export function AnalyticsTab({ orders, menuItems, todayRevenue, stats }) {
  return (
    <div className="px-4 pt-4 pb-4">
      <h2 className="font-black text-gray-800 text-lg mb-4">📊 สถิติ</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "รายได้วันนี้",   value: `${todayRevenue.toLocaleString()}฿`, icon: "💰", color: "text-green-600"  },
          { label: "ออเดอร์สำเร็จ", value: stats["ส่งสำเร็จ"],                  icon: "✅", color: "text-blue-600"   },
          { label: "รอดำเนินการ",    value: stats["รอร้านยืนยัน"],               icon: "⏳", color: "text-amber-600"  },
          { label: "เมนูทั้งหมด",   value: menuItems.length,                     icon: "🍽️", color: "text-indigo-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl mb-1">{c.icon}</p>
            <p className={`font-black text-2xl ${c.color}`}>{c.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Top Menu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="font-bold text-gray-800 text-sm mb-3">🏆 เมนูยอดนิยม</p>
        {[...menuItems]
          .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
          .slice(0, 5)
          .map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-300 font-black text-sm w-4">{i + 1}</span>
              <span className="text-xl">{item.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-700 text-sm">{item.name}</p>
                <div className="h-1.5 bg-blue-500 rounded-full mt-0.5" style={{ width: `${Math.min(100, (item.sold_count || 0) / 5)}%` }} />
              </div>
              <span className="text-gray-400 text-xs">{item.sold_count || 0} ครั้ง</span>
            </div>
          ))
        }
      </div>

      {/* Payment Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="font-bold text-gray-800 text-sm mb-3">💳 วิธีชำระเงิน</p>
        {[
          { id: "cash",      label: "💵 เงินสด"   },
          { id: "transfer",  label: "🏦 โอนเงิน"  },
          { id: "promptpay", label: "📱 PromptPay" },
        ].map(({ id, label }) => {
          const count = orders.filter((o) => o.payment_method === id).length
          const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0
          return (
            <div key={id} className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span>{pct}% · {count} ออเดอร์</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}