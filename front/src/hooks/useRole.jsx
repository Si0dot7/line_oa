// src/hooks/useRole.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export function useRole(lineUserId) {
  const [role, setRole]       = useState("customer")
  const [isActive, setActive] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lineUserId) {
      setLoading(false)
      return
    }

    // ── โหลดครั้งแรก ─────────────────────────────────────────────────
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

    // ── Realtime: อัปเดตทันทีเมื่อ admin เปลี่ยน role ────────────────
    const ch = supabase
      .channel(`role-${lineUserId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "users",
          filter: `line_user_id=eq.${lineUserId}`,
        },
        (payload) => {
          if (payload.new) {
            setRole(payload.new.role || "customer")
            setActive(payload.new.is_active ?? true)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
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