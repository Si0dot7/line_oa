// src/hooks/usePoints.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export function usePoints(userId) {
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!userId) return
    supabase
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => data && setPoints(data.points))
  }, [userId])

  return { points, setPoints }
}