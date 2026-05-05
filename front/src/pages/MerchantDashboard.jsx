import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_OPTIONS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]

const STATUS_COLOR = {
  "รอร้านยืนยัน": "#ff9800",
  "กำลังทำ": "#2196f3",
  "กำลังจัดส่ง": "#9c27b0",
  "ส่งสำเร็จ": "#4caf50",
}

export default function MerchantDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      setOrders(data.reverse())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000) // poll ทุก 10 วินาที
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (orderId, status) => {
    await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchOrders()
  }

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#666" }}>
        กำลังโหลดออเดอร์...
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#333" }}>ออเดอร์ทั้งหมด</h2>
        <button
          onClick={fetchOrders}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "1.5px solid #06C755",
            background: "transparent", color: "#06C755", cursor: "pointer", fontSize: 13,
          }}
        >
          รีเฟรช
        </button>
      </div>

      {orders.length === 0 && (
        <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
          ยังไม่มีออเดอร์
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => (
          <div
            key={order.order_id}
            style={{
              background: "#fff", borderRadius: 12, padding: 16,
              border: "1.5px solid #e0e0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: "#333" }}>{order.order_id}</span>
              <span style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 20,
                background: STATUS_COLOR[order.status] + "20",
                color: STATUS_COLOR[order.status],
                fontWeight: 600,
              }}>
                {order.status}
              </span>
            </div>

            {/* สินค้า */}
            <p style={{ margin: "0 0 6px", color: "#555", fontSize: 14 }}>
              {order.items.join(", ")}
            </p>

            {/* ที่อยู่ */}
            <p style={{ margin: "0 0 10px", color: "#888", fontSize: 13 }}>
              {order.address}
              {order.note && ` — ${order.note}`}
            </p>

            {/* ปุ่มแผนที่ */}
            <button
              onClick={() => openMap(order.lat, order.lng)}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "1.5px solid #2196f3",
                background: "transparent", color: "#2196f3", cursor: "pointer",
                fontSize: 13, marginBottom: 10, width: "100%",
              }}
            >
              เปิดแผนที่นำทาง
            </button>

            {/* อัปเดตสถานะ */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.filter((s) => s !== order.status).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(order.order_id, s)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${STATUS_COLOR[s]}`,
                    background: "transparent", color: STATUS_COLOR[s],
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}