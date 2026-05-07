// src/components/rider/EarningsTab.jsx

export function EarningsTab({ todayEarnings, weekEarnings, todayCount }) {
  const avg = todayCount > 0 ? Math.round(todayEarnings / todayCount) : 0
  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-center shadow-xl shadow-orange-200">
        <p className="text-orange-100 text-sm font-semibold mb-1">รายได้วันนี้</p>
        <p className="text-white text-5xl font-black">{todayEarnings}<span className="text-2xl ml-1">฿</span></p>
        <p className="text-orange-100 text-xs mt-2">{todayCount} งาน · เฉลี่ย {avg}฿/งาน</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "สัปดาห์นี้", value: `${weekEarnings}฿`, icon: "📅", color: "text-indigo-600" },
          { label: "งานวันนี้",  value: `${todayCount} งาน`, icon: "📦", color: "text-blue-600"   },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}