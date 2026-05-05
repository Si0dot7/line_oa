import { useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const MENU_ITEMS = [
  { id: 1, name: "ข้าวมันไก่", price: 50 },
  { id: 2, name: "ข้าวหมูแดง", price: 55 },
  { id: 3, name: "ผัดไทย", price: 60 },
  { id: 4, name: "ส้มตำ", price: 45 },
]

export default function OrderForm({ profile }) {
  const [selected, setSelected] = useState([])
  const [address, setAddress] = useState("")
  const [note, setNote] = useState("")
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState(null)

  const toggle = (item) => {
    setSelected((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    )
  }

  const getLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      () => {
        alert("ไม่สามารถดึง GPS ได้ กรุณาอนุญาต Location")
        setLocLoading(false)
      }
    )
  }

  const total = selected.reduce((sum, i) => sum + i.price, 0)

  const submit = async () => {
    if (!selected.length) return alert("กรุณาเลือกสินค้า")
    if (!address) return alert("กรุณาใส่ที่อยู่")
    if (!location) return alert("กรุณากดดึง GPS ก่อน")

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile?.userId || "guest",
          items: selected.map((i) => i.name),
          lat: location.lat,
          lng: location.lng,
          address,
          note,
        }),
      })
      const data = await res.json()
      setOrderId(data.order_id)
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + e.message)
    }
    setSubmitting(false)
  }

  if (orderId) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: "#06C755", marginBottom: 8 }}>สั่งสำเร็จ!</h2>
        <p style={{ color: "#333", fontSize: 18 }}>เลขออเดอร์ {orderId}</p>
        <p style={{ color: "#666", marginTop: 8 }}>รอรับแจ้งเตือนใน LINE นะครับ</p>
        <button
          onClick={() => { setOrderId(null); setSelected([]); setAddress(""); setNote("") }}
          style={btnStyle("#06C755")}
        >
          สั่งใหม่
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ background: "#06C755", borderRadius: 12, padding: 16, marginBottom: 16, color: "#fff" }}>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>สวัสดีครับ</p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{profile?.displayName || "ลูกค้า"}</p>
      </div>

      {/* เมนู */}
      <h3 style={{ margin: "0 0 12px", color: "#333" }}>เลือกเมนู</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {MENU_ITEMS.map((item) => {
          const isSelected = selected.find((i) => i.id === item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggle(item)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", borderRadius: 10,
                border: `2px solid ${isSelected ? "#06C755" : "#e0e0e0"}`,
                background: isSelected ? "#f0fff4" : "#fff",
                cursor: "pointer", fontSize: 15, color: "#333",
              }}
            >
              <span>{item.name}</span>
              <span style={{ color: isSelected ? "#06C755" : "#999", fontWeight: 600 }}>
                {isSelected ? "✓ " : ""}{item.price} ฿
              </span>
            </button>
          )
        })}
      </div>

      {/* ที่อยู่ */}
      <h3 style={{ margin: "0 0 8px", color: "#333" }}>ที่อยู่จัดส่ง</h3>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="บ้านเลขที่, ซอย, ถนน..."
        rows={2}
        style={{
          width: "100%", padding: 12, borderRadius: 10,
          border: "1.5px solid #e0e0e0", fontSize: 15,
          boxSizing: "border-box", resize: "none", marginBottom: 10,
        }}
      />

      {/* GPS */}
      <button
        onClick={getLocation}
        disabled={locLoading}
        style={btnStyle(location ? "#4caf50" : "#2196f3", true)}
      >
        {locLoading ? "กำลังดึง GPS..." : location ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "ดึงตำแหน่ง GPS"}
      </button>

      {/* หมายเหตุ */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="หมายเหตุ (ไม่บังคับ)"
        style={{
          width: "100%", padding: 12, borderRadius: 10,
          border: "1.5px solid #e0e0e0", fontSize: 15,
          boxSizing: "border-box", marginBottom: 20, marginTop: 10,
        }}
      />

      {/* Summary + Submit */}
      {selected.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 12, padding: 16,
          border: "1.5px solid #e0e0e0", marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 4px", color: "#666", fontSize: 13 }}>สรุปออเดอร์</p>
          {selected.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#333" }}>
              <span>{i.name}</span><span>{i.price} ฿</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#333" }}>
            <span>รวม</span><span>{total} ฿</span>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || !selected.length}
        style={btnStyle("#06C755")}
      >
        {submitting ? "กำลังส่งออเดอร์..." : `สั่งเลย (${total} ฿)`}
      </button>
    </div>
  )
}

const btnStyle = (color, outline = false) => ({
  width: "100%", padding: "14px 0", borderRadius: 10,
  border: outline ? `2px solid ${color}` : "none",
  background: outline ? "transparent" : color,
  color: outline ? color : "#fff",
  fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 0,
})