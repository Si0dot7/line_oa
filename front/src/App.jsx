// src/App.jsx
import { useEffect, useState } from "react"
import OrderForm from "./pages/OrderForm"
import MerchantDashboard from "./pages/MerchantDashboard"
import AdminPanel from "./pages/Adminpanel"
import { supabase } from "./lib/supabase"
import { useLiff } from "./hooks/useLiff"
import { useRole } from "./hooks/useRole"

export default function App() {
  const [screen, setScreen] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const { profile, liffObj, ready, error, isDev } = useLiff()

  // ── บันทึก profile ลง Supabase ก่อน แล้วค่อยให้ useRole ทำงาน ──────
  useEffect(() => {
    if (!profile) return

    if (isDev) {
      setProfileSaved(true) // dev mode ข้ามได้เลย
      return
    }

    const save = async () => {
      const { error } = await supabase.from("users").upsert(
        {
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url:  profile.pictureUrl || null,
          last_seen:    new Date().toISOString(),
        },
        { onConflict: "line_user_id" }
      )
      if (error) console.error("❌ upsert failed:", error.message)
      else console.log("✅ user saved:", profile.userId)
      setProfileSaved(true)
    }

    save()
  }, [profile, isDev])

  // ── ส่ง userId ให้ useRole ต่อเมื่อ upsert เสร็จแล้วเท่านั้น ────────
  const { role, loading: roleLoading, isMerchant, isRider, isAdmin, isActive } = useRole(
    profileSaved ? profile?.userId : null
  )

  // ── Read ?mode= from URL ────────────────────────────────────────────
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode")
    if (["merchant", "order", "admin", "rider"].includes(mode)) setScreen(mode)
  }, [])

  // ── Role gate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || roleLoading || !screen) return
    if (screen === "merchant" && !isMerchant) setScreen(null)
    if (screen === "rider"    && !isRider)    setScreen(null)
    if (screen === "admin"    && !isAdmin)    setScreen(null)
  }, [ready, roleLoading, screen, isMerchant, isRider, isAdmin])

  // ── Loading ─────────────────────────────────────────────────────────
  if (!ready || roleLoading) return (
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

  if (!isActive) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🚫</div>
        <h3 className="text-gray-800 font-bold mb-2">บัญชีถูกระงับ</h3>
        <p className="text-gray-400 text-sm">กรุณาติดต่อผู้ดูแลระบบ</p>
      </div>
    </div>
  )

  // ── Screens ──────────────────────────────────────────────────────────
  if (screen === "order") return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="สั่งสินค้า" onBack={() => setScreen(null)} color="blue" />
      <OrderForm profile={profile} liff={liffObj} />
    </div>
  )

  if (screen === "merchant" && isMerchant) return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="แดชบอร์ดร้านค้า" onBack={() => setScreen(null)} color="indigo" />
      <MerchantDashboard profile={profile} />
    </div>
  )

  if (screen === "admin" && isAdmin) return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <TopBar title="จัดการสิทธิ์" onBack={() => setScreen(null)} color="red" />
      <AdminPanel profile={profile} />
    </div>
  )

  // ── Home ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-600 flex flex-col">
      {isDev && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1 px-3">
          🛠️ DEV MODE — mock profile, ไม่ได้ต่อ LINE จริง
        </div>
      )}

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
            <span className="text-[11px] bg-white bg-opacity-20 px-2 py-0.5 rounded-full">{role}</span>
          </div>
        </div>

        <div className="relative z-10 mt-4 bg-white bg-opacity-15 rounded-2xl p-3.5 flex items-center gap-3 border border-white border-opacity-20">
          <div className="text-3xl">🎁</div>
          <div className="flex items-center-safe">
            <p className="font-bold text-sm">ฟรีค่าส่งวันนี้!</p>
          </div>
          <div className="ml-auto text-white opacity-60">›</div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-6 pb-10">
        <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest mb-4 text-center">เลือกโหมด</p>

        <HomeCard emoji="🛍️" title="สั่งสินค้า" badge="ลูกค้า"
          desc="เลือกเมนู · ระบุที่อยู่ · ติดตามออเดอร์"
          tags={["🍗 อาหาร", "📡 GPS", "📦 ติดตาม"]}
          color="blue" onClick={() => setScreen("order")} />

        {isMerchant && (
          <HomeCard emoji="🏪" title="หน้าร้านค้า" badge="ร้านขาย"
            desc="ดูออเดอร์ · อัปเดตสถานะ · นำทาง"
            tags={["📋 ออเดอร์", "🗺️ แผนที่", "🔄 อัปเดต"]}
            color="indigo" onClick={() => setScreen("merchant")} />
        )}

        {isRider && (
          <HomeCard emoji="🛵" title="หน้าไรเดอร์" badge="ไรเดอร์"
            desc="รับงาน · นำทาง · ประวัติรายได้"
            tags={["📦 งานใหม่", "🗺️ นำทาง", "💰 รายได้"]}
            color="orange" onClick={() => setScreen("rider")} />
        )}

        {isAdmin && (
          <HomeCard emoji="🔑" title="จัดการสิทธิ์" badge="Admin"
            desc="เปลี่ยน role · ปิด/เปิดบัญชี"
            tags={["👤 Users", "🛡️ Role"]}
            color="red" onClick={() => setScreen("admin")} />
        )}

        <p className="text-center text-gray-300 text-xs mt-8">LINE Delivery · Powered by Supabase</p>
      </div>
    </div>
  )
}

// ── Sub components ───────────────────────────────────────────────────

const COLOR_MAP = {
  blue:   { card: "border-blue-100",   circle: "bg-blue-50 group-hover:bg-blue-100",     icon: "from-blue-500 to-blue-700",     badge: "bg-blue-100 text-blue-600",     arrow: "text-blue-300" },
  indigo: { card: "border-indigo-100", circle: "bg-indigo-50 group-hover:bg-indigo-100", icon: "from-indigo-500 to-indigo-700", badge: "bg-indigo-100 text-indigo-600", arrow: "text-indigo-300" },
  orange: { card: "border-orange-100", circle: "bg-orange-50 group-hover:bg-orange-100", icon: "from-orange-400 to-orange-600", badge: "bg-orange-100 text-orange-600", arrow: "text-orange-300" },
  red:    { card: "border-red-100",    circle: "bg-red-50 group-hover:bg-red-100",        icon: "from-red-400 to-red-600",       badge: "bg-red-100 text-red-600",       arrow: "text-red-300" },
}

function HomeCard({ emoji, title, badge, desc, tags, color, onClick }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue
  return (
    <button onClick={onClick}
      className={`w-full mb-4 bg-white rounded-2xl p-5 shadow-sm border ${c.card} text-left
                 transition-all duration-200 hover:shadow-md active:scale-95 group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${c.circle} rounded-full -mr-8 -mt-8 transition-colors`} />
      <div className="relative flex items-center gap-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${c.icon} rounded-2xl flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-gray-900 font-bold text-lg">{title}</span>
            <span className={`${c.badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{badge}</span>
          </div>
          <p className="text-gray-400 text-sm">{desc}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {tags.map(t => <span key={t} className="bg-gray-100 text-gray-400 text-[11px] px-2 py-0.5 rounded-lg">{t}</span>)}
          </div>
        </div>
        <div className={`${c.arrow} text-2xl`}>›</div>
      </div>
    </button>
  )
}

function TopBar({ title, onBack, color = "blue" }) {
  const bgMap = { blue: "bg-blue-600", indigo: "bg-indigo-600", orange: "bg-orange-500", red: "bg-red-600" }
  return (
    <div className={`${bgMap[color] || "bg-blue-600"} px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-md`}>
      <button onClick={onBack} className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-white text-xl hover:bg-opacity-30 active:scale-90 transition-all">‹</button>
      <span className="text-white font-bold text-base">{title}</span>
    </div>
  )
}