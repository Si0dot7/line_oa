// src/App.jsx
import { useEffect, useState } from "react"
import liff from "@line/liff"
import OrderForm from "./pages/OrderForm"
import MerchantDashboard from "./pages/MerchantDashboard"
import { supabase } from "./lib/supabase"

const LIFF_ID = import.meta.env.VITE_LIFF_ID || ""

export default function App() {
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [screen, setScreen] = useState(null)
  const [liffObj, setLiffObj] = useState(null)

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    if (mode === "merchant") setScreen("merchant")
    else if (mode === "order") setScreen("order")
  }, [])

  useEffect(() => {
    if (!LIFF_ID) {
      const devProfile = { userId: "dev-user-001", displayName: "Dev User", pictureUrl: null, statusMessage: "" }
      setProfile(devProfile)
      setLiffObj(null)
      setReady(true)
      return
    }

    liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })
      .then(async () => {
        if (!liff.isLoggedIn()) { liff.login(); return }

        const p = await liff.getProfile()
        setProfile(p)
        setLiffObj(liff)

        // บันทึก LINE profile ลง Supabase
        await supabase.from("users").upsert(
          { line_user_id: p.userId, display_name: p.displayName, picture_url: p.pictureUrl || null, last_seen: new Date().toISOString() },
          { onConflict: "line_user_id" }
        )
        setReady(true)
      })
      .catch((e) => { setError(e.message); setReady(true) })
  }, [])

  if (!ready) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <div className="relative w-16 h-16 mb-5">
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-xl">🛵</div>
      </div>
      <p className="text-blue-600 font-bold text-sm">กำลังโหลด...</p>
      <p className="text-blue-300 text-xs mt-1">LINE · Supabase</p>
    </div>
  )

  if (error) return (
    <div className="p-6 min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-gray-800 font-bold mb-2">เกิดข้อผิดพลาด</h3>
        <p className="text-red-400 text-sm bg-red-50 rounded-xl p-3">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">ลองอีกครั้ง</button>
      </div>
    </div>
  )

  if (screen === "order") return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="สั่งสินค้า" onBack={() => setScreen(null)} color="blue" />
      <OrderForm profile={profile} liff={liffObj} />
    </div>
  )

  if (screen === "merchant") return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="แดชบอร์ดร้านค้า" onBack={() => setScreen(null)} color="indigo" />
      <MerchantDashboard profile={profile} />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-12 pb-8">
        <div className="absolute -top-8 -right-8 w-44 h-44 bg-blue-500 rounded-full opacity-50 pointer-events-none" />
        <div className="absolute top-4 -right-2 w-28 h-28 bg-blue-400 rounded-full opacity-30 pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-700 rounded-full opacity-40 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          {profile?.pictureUrl ? (
            <div className="relative">
              <img src={profile.pictureUrl} alt="" className="w-14 h-14 rounded-full border-2 border-white shadow-lg object-cover" />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shadow-lg">
              {profile?.displayName?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-xs mb-0.5">สวัสดีครับ 👋</p>
            <h1 className="text-white text-xl font-bold truncate">{profile?.displayName || "ยินดีต้อนรับ"}</h1>
          </div>
        </div>

        {/* Promo */}
        <div className="relative z-10 mt-4 bg-white bg-opacity-15 rounded-2xl p-3.5 flex items-center gap-3 border border-white border-opacity-20">
          <div className="text-3xl">🎁</div>
          <div>
            <p className=" font-bold text-sm">ฟรีค่าส่งวันนี้!</p>
            <p className=" text-xs">สั่งครบ 150 ฿ · ทุกวัน 11.00–14.00 น.</p>
          </div>
          <div className="ml-auto text-white opacity-60">›</div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-6 pb-10">
        <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest mb-4 text-center">เลือกโหมด</p>

        <button onClick={() => setScreen("order")}
          className="w-full mb-4 bg-white rounded-2xl p-5 shadow-sm border border-blue-100 text-left
                     transition-all duration-200 hover:shadow-md hover:border-blue-300 active:scale-95 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 group-hover:bg-blue-100 transition-colors" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0">🛍️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-gray-900 font-bold text-lg">สั่งสินค้า</span>
                <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">ลูกค้า</span>
              </div>
              <p className="text-gray-400 text-sm">เลือกเมนู · ระบุที่อยู่ · ติดตามออเดอร์</p>
              <div className="flex gap-1.5 mt-2">
                {["🍗 อาหาร", "📡 GPS", "📦 ติดตาม"].map(t => <span key={t} className="bg-gray-100 text-gray-400 text-[11px] px-2 py-0.5 rounded-lg">{t}</span>)}
              </div>
            </div>
            <div className="text-blue-300 text-2xl">›</div>
          </div>
        </button>

        <button onClick={() => setScreen("merchant")}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 text-left
                     transition-all duration-200 hover:shadow-md hover:border-indigo-300 active:scale-95 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0">🏪</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-gray-900 font-bold text-lg">หน้าร้านค้า</span>
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">ร้านขาย</span>
              </div>
              <p className="text-gray-400 text-sm">ดูออเดอร์ · อัปเดตสถานะ · นำทาง</p>
              <div className="flex gap-1.5 mt-2">
                {["📋 ออเดอร์", "🗺️ แผนที่", "🔄 อัปเดต"].map(t => <span key={t} className="bg-gray-100 text-gray-400 text-[11px] px-2 py-0.5 rounded-lg">{t}</span>)}
              </div>
            </div>
            <div className="text-indigo-300 text-2xl">›</div>
          </div>
        </button>

        <p className="text-center text-gray-300 text-xs mt-8">LINE Delivery · Powered by Supabase</p>
      </div>
    </div>
  )
}

function TopBar({ title, onBack, color = "blue" }) {
  const bg = color === "indigo" ? "bg-indigo-600" : "bg-blue-600"
  return (
    <div className={`${bg} px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-md`}>
      <button onClick={onBack} className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-white text-xl hover:bg-opacity-30 active:scale-90 transition-all">‹</button>
      <span className="text-white font-bold text-base">{title}</span>
    </div>
  )
}