// src/hooks/useLiff.js
/**
 * จัดการ LIFF init แยก dev / production
 * - localhost → ใช้ mock profile โดยไม่ redirect ไป LINE
 * - production → init LIFF จริง + บังคับ login
 */
import { useState, useEffect } from "react"

const LIFF_ID   = import.meta.env.VITE_LIFF_ID || ""
const IS_DEV    = import.meta.env.DEV ||
                  typeof window !== "undefined" &&
                  (window.location.hostname === "localhost" ||
                   window.location.hostname === "127.0.0.1")

// Mock profile สำหรับ dev — แก้ชื่อ/รูปได้ตามต้องการ
const DEV_PROFILE = {
  userId:      "dev-user-001",
  displayName: "Dev User 🛠️",
  pictureUrl:  null,
}

export function useLiff() {
  const [profile, setProfile] = useState(null)
  const [liffObj, setLiffObj] = useState(null)
  const [ready, setReady]     = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    if (IS_DEV || !LIFF_ID) {
      // Dev mode: ข้าม LIFF init ทั้งหมด
      console.info("[LIFF] Dev mode — ใช้ mock profile, ไม่ redirect LINE")
      setProfile(DEV_PROFILE)
      setLiffObj(null)
      setReady(true)
      return
    }

    // Production: init LIFF จริง
    import("@line/liff").then(({ default: liff }) => {
      liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })
        .then(async () => {
          if (!liff.isLoggedIn()) {
            liff.login()   // redirect ไป LINE login
            return         // หยุดรอ redirect
          }
          const p = await liff.getProfile()
          setProfile(p)
          setLiffObj(liff)
          setReady(true)
        })
        .catch((e) => {
          setError(e.message)
          setReady(true)
        })
    })
  }, [])

  return { profile, liffObj, ready, error, isDev: IS_DEV }
}