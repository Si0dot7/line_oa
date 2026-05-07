// src/components/order/ProfileTab.jsx

export function ProfileTab({ profile, points, myOrders, savedAddresses, onUseAddress }) {
  return (
    <div className="px-4 pt-5">
      {/* Profile Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 mb-5 flex items-center gap-4">
        {profile?.pictureUrl
          ? <img src={profile.pictureUrl} alt="" className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover" />
          : <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 font-black text-2xl">{profile?.displayName?.[0]}</div>
        }
        <div>
          <p className="text-white font-black text-lg">{profile?.displayName}</p>
          <p className="text-blue-200 text-sm">{profile?.userId?.slice(0, 16)}...</p>
        </div>
      </div>

      {/* Points */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 mb-4 text-white">
        <p className="text-amber-100 text-sm font-medium mb-1">แต้มสะสม</p>
        <p className="text-white font-black text-4xl">{points} <span className="text-xl">แต้ม</span></p>
        <p className="text-amber-100 text-xs mt-1">= {Math.floor(points / 10)} ฿ ส่วนลด · สะสม 10 แต้ม/10฿</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-gray-400 text-xs mb-1">ออเดอร์ทั้งหมด</p>
          <p className="font-black text-2xl text-gray-800">{myOrders.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-gray-400 text-xs mb-1">ยอดสั่งซื้อรวม</p>
          <p className="font-black text-2xl text-blue-600">{myOrders.reduce((s, o) => s + (o.total_price || 0), 0)}฿</p>
        </div>
      </div>

      {/* Saved Addresses */}
      <p className="text-gray-700 font-bold text-sm mb-2">ที่อยู่จัดส่งบ่อย</p>
      {savedAddresses.length === 0 ? (
        <p className="text-gray-400 text-sm">ยังไม่มีที่อยู่บันทึก</p>
      ) : (
        savedAddresses.map((a, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-2 flex items-center gap-3 shadow-sm">
            <span className="text-xl">📍</span>
            <div className="flex-1">
              <p className="text-gray-700 text-sm font-medium">{a.address}</p>
              <p className="text-gray-400 text-xs">ใช้ {a.used_count} ครั้ง</p>
            </div>
            <button onClick={() => onUseAddress(a.address)} className="text-blue-500 text-xs font-semibold">ใช้</button>
          </div>
        ))
      )}
    </div>
  )
}