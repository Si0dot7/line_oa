// src/hooks/useRole.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

/**
 * อ่าน role ของ user จาก Supabase users table
 * @param {string} lineUserId - LINE userId จาก LIFF profile
 * @returns {{ role, loading, isCustomer, isMerchant, isRider, isAdmin, isActive }}
 */
export function useRole(lineUserId) {
  const [role, setRole]       = useState("customer")
  const [isActive, setActive] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lineUserId) { setLoading(false); return }

    supabase
      .from("users")
      .select("role, is_active")
      .eq("line_user_id", lineUserId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setRole(data.role || "customer")
          setActive(data.is_active ?? true)
        }
        setLoading(false)
      })
  }, [lineUserId]).then(({ data, error }) => {
  if (!error && data) {
    setRole(data.role || "customer")
    setActive(data.is_active ?? true)
  }
  // ถ้า error (เช่น PGRST116 = no rows) → ใช้ default customer ไปก่อน
  // ไม่ต้องแก้อะไรเพราะ default อยู่แล้ว แต่ log ไว้ดีกว่า
  if (error) console.warn("useRole:", error.code, error.message)
  setLoading(false)
})

  return {
    role,
    loading,
    isActive,
    isCustomer: role === "customer",
    isMerchant: role === "merchant" || role === "admin",
    isRider:    role === "rider"    || role === "admin",
    isAdmin:    role === "admin",
  }
}