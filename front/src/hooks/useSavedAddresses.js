// src/hooks/useSavedAddresses.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export function useSavedAddresses(userId) {
  const [savedAddresses, setSavedAddresses] = useState([])

  const load = () => {
    if (!userId) return
    supabase
      .from("saved_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("used_count", { ascending: false })
      .limit(5)
      .then(({ data }) => data && setSavedAddresses(data))
  }

  useEffect(() => { load() }, [userId])

  const saveAddress = async (addr) => {
    if (!addr || !userId) return
    const existing = savedAddresses.find((a) => a.address === addr)
    if (existing) {
      await supabase
        .from("saved_addresses")
        .update({ used_count: existing.used_count + 1 })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("saved_addresses")
        .insert({ user_id: userId, address: addr, used_count: 1 })
    }
    load()
  }

  return { savedAddresses, saveAddress }
}