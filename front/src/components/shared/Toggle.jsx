// src/components/shared/Toggle.jsx
/** สวิตช์ on/off ใช้ร่วมกันระหว่าง MenuForm และ AdminPanel */
export function Toggle({ value, onChange, label, color = "green" }) {
  const colorMap = { green: "bg-green-500", red: "bg-red-500", amber: "bg-amber-500" }
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onChange}
        className={`w-10 h-6 rounded-full transition-all relative ${value ? colorMap[color] : "bg-gray-300"}`}
      >
        <div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
          style={{ left: value ? "calc(100% - 22px)" : "2px" }}
        />
      </div>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
    </label>
  )
}