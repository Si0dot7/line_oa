// src/components/shared/EmptyState.jsx
export function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-gray-500 font-semibold">{title}</p>
      {sub && <p className="text-gray-300 text-sm mt-1">{sub}</p>}
    </div>
  )
}

export function Spinner({ color = "blue" }) {
  const borderColor = { blue: "border-blue-500", orange: "border-orange-500", indigo: "border-indigo-500" }
  return (
    <div className="flex justify-center py-12">
      <div className={`w-8 h-8 border-4 border-gray-200 ${borderColor[color] || "border-blue-500"} border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}