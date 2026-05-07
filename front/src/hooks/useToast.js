// src/hooks/useToast.js
import { useState, useRef, useCallback } from "react"

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}