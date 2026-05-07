// src/components/shared/Toast.jsx
export function Toast({ toast }) {
  if (!toast) return null
  const colorMap = {
    error:   "bg-red-500",
    success: "bg-green-500",
    info:    "bg-gray-800",
  }
  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl
        text-white text-sm font-semibold shadow-xl transition-all duration-300
        ${colorMap[toast.type] || "bg-gray-800"}`}
      style={{ maxWidth: "90vw", textAlign: "center" }}
    >
      {toast.msg}
    </div>
  )
}