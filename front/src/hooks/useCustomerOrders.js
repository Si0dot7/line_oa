// src/hooks/useCustomerOrders.js
// Hook สำหรับ OrderForm — ดูเฉพาะ orders ของตัวเอง
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"

export function useCustomerOrders(userId) {
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
    if (data) setMyOrders(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchOrders()
    const ch = supabase
      .channel("orders-user-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT")
            setMyOrders((p) => [payload.new, ...p])
          else if (payload.eventType === "UPDATE")
            setMyOrders((p) => p.map((o) => (o.id === payload.new.id ? payload.new : o)))
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, fetchOrders])

  return { myOrders, loading, refetch: fetchOrders }
}