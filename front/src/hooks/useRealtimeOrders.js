// src/hooks/useRealtimeOrders.js
// Hook สำหรับ MerchantDashboard — ดู orders ทั้งหมด
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"

export function useRealtimeOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
    if (data) setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const ch = supabase
      .channel("merchant-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders((prev) => [payload.new, ...prev])
        } else if (payload.eventType === "UPDATE") {
          setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchOrders])

  return { orders, loading, refetch: fetchOrders }
}