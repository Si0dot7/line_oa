// src/components/merchant/MenuForm.jsx
import { Toggle } from "../shared/Toggle"
import { CATEGORIES, EMOJI_PRESETS } from "../../constants/menuConstants"

export function MenuForm({ form, setForm, editingItem, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-5 pb-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-black text-gray-800 text-lg mb-4">
          {editingItem ? "✏️ แก้ไขเมนู" : "➕ เพิ่มเมนูใหม่"}
        </h3>

        {/* Emoji Picker */}
        <p className="text-gray-500 text-sm font-semibold mb-2">เลือกไอคอน</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              onClick={() => setForm((f) => ({ ...f, emoji: e }))}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                ${form.emoji === e ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100"}`}
            >
              {e}
            </button>
          ))}
          <input
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            className="w-10 h-10 rounded-xl text-center border border-dashed border-gray-300 text-xl focus:outline-none focus:border-blue-400"
            maxLength={2}
            placeholder="?"
          />
        </div>

        {/* Name & Price */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-gray-500 text-xs font-semibold mb-1">ชื่อเมนู *</p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="เช่น ข้าวมันไก่"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]"
            />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold mb-1">ราคา (฿) *</p>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="50"
              type="number"
              min="0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]"
            />
          </div>
        </div>

        {/* Category */}
        <div className="mb-3">
          <p className="text-gray-500 text-xs font-semibold mb-1">หมวดหมู่</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm((f) => ({ ...f, category: cat }))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all
                  ${form.category === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-gray-500 text-xs font-semibold mb-1">คำอธิบาย</p>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="เช่น ไก่ต้มนุ่ม น้ำซุปหอม"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-[inherit]"
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-4 mb-5">
          <Toggle
            value={form.is_available}
            onChange={() => setForm((f) => ({ ...f, is_available: !f.is_available }))}
            label="เปิดขาย"
            color="green"
          />
          <Toggle
            value={form.is_popular}
            onChange={() => setForm((f) => ({ ...f, is_popular: !f.is_popular }))}
            label="🔥 ยอดนิยม"
            color="red"
          />
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-dashed border-gray-200">
          <span className="text-3xl">{form.emoji}</span>
          <div>
            <p className="font-bold text-gray-800">{form.name || "ชื่อเมนู"}</p>
            <p className="text-blue-600 font-black">{form.price || "0"}฿</p>
          </div>
          {form.is_popular && (
            <span className="ml-auto bg-red-100 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">ยอดนิยม</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl active:scale-95">
            ยกเลิก
          </button>
          <button onClick={onSave} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95">
            {editingItem ? "💾 บันทึก" : "➕ เพิ่มเมนู"}
          </button>
        </div>
      </div>
    </div>
  )
}