// src/hooks/useFlashDeals.js
// ใช้ร่วมกันระหว่าง OrderForm (อ่าน) และ MerchantDashboard (CRUD)
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

/** อ่าน flash deals ที่ active อยู่ตอนนี้ (สำหรับลูกค้า) */
export function useActiveFlashDeals() {
  const [deals, setDeals] = useState([])

  useEffect(() => {
    const fetchDeals = async () => {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from("flash_deals")
        .select("*, menu_items(*)")
        .lte("start_at", now)
        .gte("end_at", now)
        .eq("is_active", true)
      if (data) setDeals(data)
    }
    fetchDeals()
    const interval = setInterval(fetchDeals, 60_000)
    return () => clearInterval(interval)
  }, [])

  return { deals }
}

/** CRUD สำหรับร้านค้า */
export function useMerchantFlashDeals() {
  const [deals, setDeals] = useState([])

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("flash_deals")
      .select("*, menu_items(name, emoji)")
      .order("created_at", { ascending: false })
      .limit(10)
    if (data) setDeals(data)
  }

  useEffect(() => { fetchDeals() }, [])

  const addDeal = async (deal) => {
    const { data, error } = await supabase
      .from("flash_deals")
      .insert({ ...deal, is_active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    fetchDeals()
    return data
  }

  const removeDeal = async (id) => {
    await supabase.from("flash_deals").update({ is_active: false }).eq("id", id)
    fetchDeals()
  }

  return { deals, addDeal, removeDeal, refetch: fetchDeals }
}