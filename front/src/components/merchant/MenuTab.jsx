// src/components/merchant/MenuTab.jsx

export function MenuTab({ menuItems, loading, onAdd, onEdit, onDelete, onToggleAvailable }) {
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-black text-gray-800 text-lg">จัดการเมนู</h2>
          <p className="text-gray-400 text-xs">{menuItems.length} รายการ · {menuItems.filter((m) => m.is_available).length} เปิดขาย</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all">
          ➕ เพิ่มเมนู
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-400 font-medium mb-5">ยังไม่มีเมนู</p>
          <button onClick={onAdd} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95">
            เพิ่มเมนูแรก
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {menuItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              onToggle={() => onToggleAvailable(item.id, item.is_available)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItemCard({ item, onEdit, onDelete, onToggle }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${item.is_available ? "border-gray-100" : "border-red-100 opacity-60"}`}>
      <div className="flex items-center gap-3 p-3">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${item.is_available ? "bg-gray-50" : "bg-red-50"}`}>
          {item.image_url
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
            : (item.emoji || "🍽️")
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-bold text-gray-800 text-sm">{item.name}</p>
            {item.is_popular && <span className="bg-red-100 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">🔥 ยอดนิยม</span>}
            {!item.is_available && <span className="bg-gray-100 text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">ปิด</span>}
          </div>
          <p className="text-blue-600 font-black">{item.price}฿ <span className="text-gray-300 font-normal text-xs">· {item.category}</span></p>
          {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
          <p className="text-gray-300 text-[10px]">★{item.rating?.toFixed(1)} · ขายแล้ว {item.sold_count || 0} ครั้ง</p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onToggle}
            className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${item.is_available ? "bg-green-500" : "bg-gray-300"}`}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: item.is_available ? "calc(100% - 22px)" : "2px" }} />
          </button>
          <button onClick={onEdit} className="w-10 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-blue-100 active:scale-90 transition-all">✏️</button>
          <button onClick={onDelete} className="w-10 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center text-sm hover:bg-red-100 active:scale-90 transition-all">🗑️</button>
        </div>
      </div>
    </div>
  )
}