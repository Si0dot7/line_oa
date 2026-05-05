import { useEffect, useState } from "react"
import liff from "@line/liff"
import OrderForm from "./pages/OrderForm"
import MerchantDashboard from "./pages/MerchantDashboard"

const LIFF_ID = import.meta.env.VITE_LIFF_ID || ""

export default function App() {
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    if (mode === "merchant") setScreen("merchant")
    else if (mode === "order") setScreen("order")
  }, [])

  useEffect(() => {
    if (!LIFF_ID) {
      setProfile({ userId: "dev-user-001", displayName: "Dev User" })
      setReady(true)
      return
    }
    liff.init({ liffId: LIFF_ID })
      .then(() => {
        if (!liff.isLoggedIn()) { liff.login(); return }
        return liff.getProfile()
      })
      .then((p) => { if (p) { setProfile(p); setReady(true) } })
      .catch((e) => { setError(e.message); setReady(true) })
  }, [])

  if (!ready) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-blue-400 text-sm font-medium">กำลังโหลด...</p>
    </div>
  )

  if (error) return (
    <div className="p-6 min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow text-center max-w-sm w-full">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-500 text-sm">เกิดข้อผิดพลาด: {error}</p>
      </div>
    </div>
  )

  if (screen === "order") return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="สั่งสินค้า" onBack={() => setScreen(null)} color="blue" />
      <OrderForm profile={profile} />
    </div>
  )

  if (screen === "merchant") return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="แดชบอร์ดร้านค้า" onBack={() => setScreen(null)} color="indigo" />
      <MerchantDashboard />
    </div>
  )

  // Home Screen
  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col">
      {/* Hero Header */}
      <div className="relative overflow-hidden px-6 pt-14 pb-10">
        {/* Background circles decoration */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500 rounded-full opacity-50" />
        <div className="absolute top-6 -right-4 w-32 h-32 bg-blue-400 rounded-full opacity-30" />
        <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-blue-700 rounded-full opacity-40" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shadow">
              {profile?.displayName?.[0] || "U"}
            </div>
            <span className="text-blue-100 text-sm">สวัสดีครับ 👋</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">
            {profile?.displayName || "ยินดีต้อนรับ"}
          </h1>
          <p className="text-blue-200 text-sm mt-1">เลือกโหมดการใช้งาน</p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-6 pb-10">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4 text-center">
          คุณต้องการทำอะไร?
        </p>

        {/* Customer Card */}
        <button
          onClick={() => setScreen("order")}
          className="w-full mb-4 bg-white rounded-2xl p-5 shadow-sm border border-blue-100 text-left
                     active:scale-98 transition-all duration-150 hover:shadow-md hover:border-blue-300
                     group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 group-hover:bg-blue-100 transition-colors" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0">
              🛍️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-900 font-bold text-lg">สั่งสินค้า</span>
                <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">ลูกค้า</span>
              </div>
              <p className="text-gray-400 text-sm leading-snug">เลือกเมนู · ระบุที่อยู่ · ติดตามออเดอร์</p>
              <div className="flex gap-2 mt-3">
                {["🍗 อาหาร", "📦 จัดส่ง", "📡 GPS"].map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-blue-400 text-xl self-center">›</div>
          </div>
        </button>

        {/* Merchant Card */}
        <button
          onClick={() => setScreen("merchant")}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 text-left
                     active:scale-98 transition-all duration-150 hover:shadow-md hover:border-indigo-300
                     group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0">
              🏪
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-900 font-bold text-lg">หน้าร้านค้า</span>
                <span className="bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">ร้านขาย</span>
              </div>
              <p className="text-gray-400 text-sm leading-snug">ดูออเดอร์ · อัปเดตสถานะ · นำทาง</p>
              <div className="flex gap-2 mt-3">
                {["📋 ออเดอร์", "🗺️ แผนที่", "🔄 อัปเดต"].map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-indigo-400 text-xl self-center">›</div>
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-1.5 h-1.5 bg-blue-300 rounded-full" />
          <p className="text-gray-300 text-xs">LINE Delivery · Powered by MVP</p>
          <div className="w-1.5 h-1.5 bg-blue-300 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function TopBar({ title, onBack, color = "blue" }) {
  const colors = {
    blue: "bg-blue-600",
    indigo: "bg-indigo-600",
  }
  return (
    <div className={`${colors[color]} px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-md`}>
      <button
        onClick={onBack}
        className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-white
                   hover:bg-opacity-30 transition-colors active:scale-95"
      >
        ‹
      </button>
      <span className="text-white font-semibold text-base tracking-wide">{title}</span>
    </div>
  )
}