// src/components/order/FlashCountdown.jsx
import { useState, useEffect } from "react"

export function FlashCountdown({ endAt }) {
  const [left, setLeft] = useState("")

  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(endAt) - Date.now()) / 1000))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [endAt])

  return <>{left}</>
}