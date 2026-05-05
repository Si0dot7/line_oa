import { useEffect, useState } from "react"
import liff from "@line/liff"
import OrderForm from "./pages/OrderForm"
import MerchantDashboard from "./pages/MerchantDashboard"

const LIFF_ID = import.meta.env.VITE_LIFF_ID || ""

export default function App() {
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [screen, setScreen] = useState(null) // null = home, "order", "merchant"

  // อ่าน mode จาก URL เช่น ?mode=merchant หรือ ?mode=order
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
    <div style={styles.center}>
      <p style={{ color: "#888" }}>กำลังโหลด...</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: "red" }}>เกิดข้อผิดพลาด: {error}</p>
    </div>
  )

  if (screen === "order") return (
    <div style={styles.wrap}>
      <TopBar title="สั่งสินค้า" onBack={() => setScreen(null)} />
      <OrderForm profile={profile} />
    </div>
  )

  if (screen === "merchant") return (
    <div style={styles.wrap}>
      <TopBar title="จัดการออเดอร์" onBack={() => setScreen(null)} />
      <MerchantDashboard />
    </div>
  )

  // หน้า Home
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>สวัสดีครับ</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {profile?.displayName || "ยินดีต้อนรับ"}
        </p>
      </div>

      <div style={{ padding: 24 }}>
        <p style={{ color: "#888", marginBottom: 24, textAlign: "center" }}>
          เลือกโหมดการใช้งาน
        </p>

        <button onClick={() => setScreen("order")} style={styles.bigBtn("#06C755")}>
          <span style={{ fontSize: 40, marginBottom: 12, display: "block" }}>🛵</span>
          <span style={{ fontSize: 20, fontWeight: 700, display: "block" }}>สั่งสินค้า</span>
          <span style={{ fontSize: 13, opacity: 0.85, display: "block", marginTop: 4 }}>
            เลือกเมนู · ระบุที่อยู่ · รอรับของ
          </span>
        </button>

        <button onClick={() => setScreen("merchant")} style={styles.bigBtn("#2196f3")}>
          <span style={{ fontSize: 40, marginBottom: 12, display: "block" }}>📋</span>
          <span style={{ fontSize: 20, fontWeight: 700, display: "block" }}>หน้าร้านค้า</span>
          <span style={{ fontSize: 13, opacity: 0.85, display: "block", marginTop: 4 }}>
            ดูและอัปเดตสถานะออเดอร์
          </span>
        </button>

        <p style={{ textAlign: "center", color: "#bbb", fontSize: 12, marginTop: 24 }}>
          LINE Delivery MVP
        </p>
      </div>
    </div>
  )
}

function TopBar({ title, onBack }) {
  return (
    <div style={{
      background: "#fff", padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12,
      borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 10,
    }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 20, color: "#333", padding: "0 4px",
      }}>←</button>
      <span style={{ fontWeight: 600, fontSize: 16, color: "#333" }}>{title}</span>
    </div>
  )
}

const styles = {
  wrap: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },
  header: {
    background: "#06C755", padding: "24px 20px 20px",
    color: "#fff", borderRadius: "0 0 20px 20px",
  },
  bigBtn: (color) => ({
    width: "100%", padding: "28px 20px", marginBottom: 16,
    background: color, color: "#fff",
    border: "none", borderRadius: 16, cursor: "pointer",
    textAlign: "center", boxShadow: `0 4px 16px ${color}44`,
  }),
}