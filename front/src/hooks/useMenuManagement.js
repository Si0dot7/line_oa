// src/hooks/useMenuManagement.js
// CRUD สำหรับ MerchantDashboard
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export function useMenuManagement() {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMenu = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
    if (data) setMenuItems(data)
    setLoading(false)
  }

  useEffect(() => { fetchMenu() }, [])

  const addItem = async (item) => {
    const maxSort = menuItems.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
    const { data, error } = await supabase
      .from("menu_items")
      .insert({ ...item, sort_order: maxSort + 1, sold_count: 0, rating: 4.5 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setMenuItems((prev) => [...prev, data])
    return data
  }

  const updateItem = async (id, updates) => {
    const { error } = await supabase.from("menu_items").update(updates).eq("id", id)
    if (error) throw new Error(error.message)
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)))
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id)
    if (error) throw new Error(error.message)
    setMenuItems((prev) => prev.filter((i) => i.id !== id))
  }

  const toggleAvailable = (id, current) => updateItem(id, { is_available: !current })

  return { menuItems, loading, addItem, updateItem, deleteItem, toggleAvailable, refetch: fetchMenu }
}