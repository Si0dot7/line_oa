// src/components/order/MenuGrid.jsx
import { useState, useRef } from "react"
import { FlashCountdown } from "./FlashCountdown"

export function MenuGrid({ menuItems, deals, categories, onQtyChange, quantities }) {
  const [category, setCategory] = useState("ทั้งหมด")
  const [search, setSearch] = useState("")
  const [addedAnim, setAddedAnim] = useState(null)
  const searchRef = useRef(null)

  const setQty = (id, delta) => {
    if (delta > 0) {
      setAddedAnim(id)
      setTimeout(() => setAddedAnim(null), 400)
    }
    onQtyChange(id, delta)
  }

  const filteredMenu = menuItems.filter((i) => {
    const matchCat    = category === "ทั้งหมด" || i.category === category
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div>
      {/* Flash Deal Banner */}
      {deals.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 flex items-center gap-3">
          <div className="text-2xl animate-pulse">⚡</div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">Flash Deal วันนี้เท่านั้น!</p>
            <p className="text-red-100 text-xs">{deals[0].menu_items?.name} ลด {deals[0].discount_percent}%</p>
          </div>
          <div className="bg-white bg-opacity-20 text-white text-xs font-bold px-2 py-1 rounded-lg">
            <FlashCountdown endAt={deals[0].end_at} />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเมนู..."
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm font-[inherit]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">×</button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto no-scrollbar px-4 py-2 gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150
              ${category === cat ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-gray-500 border border-gray-200"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-4 pb-4">
        {filteredMenu.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-medium">ไม่พบเมนูที่ค้นหา</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map((item) => {
            const qty      = quantities[item.id] || 0
            const isAdded  = addedAnim === item.id
            const deal     = deals.find((d) => d.menu_item_id === item.id)
            const finalPrice = deal ? Math.round(item.price * (1 - deal.discount_percent / 100)) : item.price

            return (
              <div key={item.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-150
                  ${qty > 0 ? "border-blue-200 shadow-blue-100" : "border-gray-100"}
                  ${isAdded ? "scale-95" : "scale-100"}`}>
                <div className={`relative h-24 flex items-center justify-center text-5xl ${qty > 0 ? "bg-blue-50" : "bg-gray-50"}`}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover absolute inset-0" />
                    : <span className={`transition-transform duration-200 ${isAdded ? "scale-125" : ""}`}>{item.emoji || "🍽️"}</span>
                  }
                  {item.is_popular && <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">ยอดนิยม</span>}
                  {deal && <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{deal.discount_percent}%</span>}
                  {qty > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md">{qty}</div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{item.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-400 text-[10px]">★</span>
                    <span className="text-gray-400 text-[10px]">{item.rating?.toFixed(1)} · {item.sold_count}ครั้ง</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="font-black text-blue-600 text-sm">{finalPrice}฿</span>
                      {deal && <span className="text-gray-300 text-[10px] line-through ml-1">{item.price}฿</span>}
                    </div>
                    {qty === 0 ? (
                      <button onClick={() => setQty(item.id, 1)} className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm active:scale-90 transition-all">+</button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(item.id, -1)} className="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-bold active:scale-90">−</button>
                        <span className="w-5 text-center text-sm font-black text-blue-600">{qty}</span>
                        <button onClick={() => setQty(item.id, 1)} className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold active:scale-90">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}