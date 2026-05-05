import { useEffect, useState } from "react"
import liff from "@line/liff"
import OrderForm from "./pages/OrderForm"
import MerchantDashboard from "./pages/MerchantDashboard"

const LIFF_ID = import.meta.env.VITE_LIFF_ID || ""

export default function App() {
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  // ดูจาก URL param ว่าเป็น mode ไหน
  const mode = new URLSearchParams(window.location.search).get("mode") || "customer"

  useEffect(() => {
    if (!LIFF_ID) {
      // Dev mode: ข้าม LIFF init ให้ทดสอบ UI ได้ตรงๆ
      setProfile({ userId: "dev-user-001", displayName: "Dev User" })
      setReady(true)
      return
    }

    liff.init({ liffId: LIFF_ID })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }
        return liff.getProfile()
      })
      .then((p) => {
        if (p) {
          setProfile(p)
          setReady(true)
        }
      })
      .catch((e) => {
        setError(e.message)
        setReady(true)
      })
  }, [])

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#666" }}>กำลังโหลด...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "red" }}>เกิดข้อผิดพลาด: {error}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5" }}>
      {mode === "merchant"
        ? <MerchantDashboard />
        : <OrderForm profile={profile} />
      }
    </div>
  )
}