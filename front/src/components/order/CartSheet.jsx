// src/components/order/CartSheet.jsx

export function CartSheet({ selectedItems, quantities, total, onQtyChange, onCheckout, onClose }) {
  const itemCount = selectedItems.reduce((s, i) => s + quantities[i.id], 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 pb-10 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">ตะกร้า ({itemCount} รายการ)</h3>
          <button onClick={() => onQtyChange(null, 0, "clear")} className="text-red-400 text-sm font-semibold">ล้างทั้งหมด</button>
        </div>

        {selectedItems.length === 0 ? (
          <p className="text-gray-400 text-center py-10">ตะกร้าว่างเปล่า</p>
        ) : (
          selectedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100">
              <span className="text-2xl">{item.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                <p className="text-blue-500 text-sm font-bold">{item.price * quantities[item.id]}฿</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
                <button onClick={() => onQtyChange(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">−</button>
                <span className="w-5 text-center text-sm font-bold">{quantities[item.id]}</span>
                <button onClick={() => onQtyChange(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-blue-600 font-bold">+</button>
              </div>
            </div>
          ))
        )}

        {selectedItems.length > 0 && (
          <button onClick={onCheckout} className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all">
            ดำเนินการสั่งซื้อ · {total}฿
          </button>
        )}
      </div>
    </div>
  )
}