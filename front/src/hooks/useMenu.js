// src/hooks/useMenu.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { FALLBACK_MENU } from "../constants/menuConstants"

export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState(["ทั้งหมด"])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true })

      if (data && data.length > 0) {
        setMenuItems(data)
        setCategories(["ทั้งหมด", ...new Set(data.map((i) => i.category).filter(Boolean))])
      } else {
        setMenuItems(FALLBACK_MENU)
        setCategories(["ทั้งหมด", "ข้าว", "เส้น", "ยำ/ต้ม", "พิเศษ"])
      }
      setLoading(false)
    }

    fetchMenu()
    const ch = supabase
      .channel("menu-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, fetchMenu)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  return { menuItems, categories, loading }
}