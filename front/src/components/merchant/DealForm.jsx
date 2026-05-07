// src/components/merchant/DealForm.jsx
const DISCOUNT_OPTIONS = [10, 15, 20, 25, 30, 50]

export function DealForm({ form, setForm, menuItems, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-black text-gray-800 text-lg mb-4">⚡ สร้าง Flash Deal</h3>

        <p className="text-gray-500 text-xs font-semibold mb-1">เลือกเมนู</p>
        <select
          value={form.menu_item_id}
          onChange={(e) => setForm((f) => ({ ...f, menu_item_id: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:border-orange-400 font-[inherit] bg-white"
        >
          <option value="">-- เลือกเมนู --</option>
          {menuItems.map((m) => (
            <option key={m.id} value={m.id}>
              {m.emoji} {m.name} ({m.price}฿)
            </option>
          ))}
        </select>

        <p className="text-gray-500 text-xs font-semibold mb-1">ส่วนลด (%)</p>
        <div className="flex gap-2 mb-3">
          {DISCOUNT_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setForm((f) => ({ ...f, discount_percent: p }))}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all
                ${form.discount_percent === p ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              {p}%
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "เริ่ม", key: "start_at" },
            { label: "สิ้นสุด", key: "end_at" },
          ].map(({ label, key }) => (
            <div key={key}>
              <p className="text-gray-500 text-xs font-semibold mb-1">{label}</p>
              <input
                type="datetime-local"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 font-[inherit]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95">
            ยกเลิก
          </button>
          <button onClick={onSave} className="flex-[2] py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 active:scale-95">
            ⚡ เปิด Flash Deal
          </button>
        </div>
      </div>
    </div>
  )
}