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
    if (!lineUserId) {
      setLoading(false)
      return
    }

    supabase
      .from("users")
      .select("role, is_active")
      .eq("line_user_id", lineUserId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn("useRole:", error.code, error.message)
        } else if (data) {
          setRole(data.role || "customer")
          setActive(data.is_active ?? true)
        }
        setLoading(false)
      })
  }, [lineUserId])

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