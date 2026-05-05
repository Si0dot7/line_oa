import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const STATUS_OPTIONS = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]

const STATUS_COLOR = {
  "รอร้านยืนยัน": "#ff9800",
  "กำลังทำ": "#2196f3",
  "กำลังจัดส่ง": "#9c27b0",
  "ส่งสำเร็จ": "#4caf50",
}

const STATUS_ICON = {
  "รอร้านยืนยัน": "⏳",
  "กำลังทำ": "👨‍🍳",
  "กำลังจัดส่ง": "🛵",
  "ส่งสำเร็จ": "✅",
}

export default function MerchantDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด")
  const [updatingId, setUpdatingId] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      setOrders(data.reverse())
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId)
    try {
      await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await fetchOrders()
    } catch (e) {
      alert("อัปเดตไม่สำเร็จ: " + e.message)
    }
    setUpdatingId(null)
  }

  const openMap = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
  }

  // Stats
  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length
    return acc
  }, {})

  const filteredOrders = filterStatus === "ทั้งหมด"
    ? orders
    : orders.filter((o) => o.status === filterStatus)

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p style={{ color: "#888" }}>กำลังโหลดออเดอร์...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8, marginBottom: 16,
      }}>
        {STATUS_OPTIONS.map((s) => (
          <div
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "ทั้งหมด" : s)}
            style={{
              background: "#fff", borderRadius: 12, padding: "12px 14px",
              border: `2px solid ${filterStatus === s ? STATUS_COLOR[s] : "#e0e0e0"}`,
              cursor: "pointer", transition: "border-color 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#666" }}>{STATUS_ICON[s]} {s}</span>
              <span style={{
                fontWeight: 800, fontSize: 22,
                color: stats[s] > 0 ? STATUS_COLOR[s] : "#ccc",
              }}>{stats[s]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 700, color: "#333", fontSize: 15 }}>
            {filterStatus === "ทั้งหมด" ? `ทั้งหมด (${orders.length})` : `${filterStatus} (${filteredOrders.length})`}
          </span>
          {lastUpdate && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#bbb" }}>
              อัปเดต {lastUpdate.toLocaleTimeString("th-TH")}
            </p>
          )}
        </div>
        <button
          onClick={fetchOrders}
          style={{
            padding: "8px 16px", borderRadius: 8,
            border: "1.5px solid #06C755", background: "transparent",
            color: "#06C755", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >🔄 รีเฟรช</button>
      </div>

      {filteredOrders.length === 0 && (
        <div style={{ textAlign: "center", color: "#bbb", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>ไม่มีออเดอร์ใน "{filterStatus}"</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredOrders.map((order) => (
          <div
            key={order.order_id}
            style={{
              background: "#fff", borderRadius: 14, padding: 16,
              border: `1.5px solid ${updatingId === order.order_id ? STATUS_COLOR[order.status] : "#e0e0e0"}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              opacity: updatingId === order.order_id ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: "#333", fontSize: 15 }}>{order.order_id}</span>
              <span style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 20,
                background: STATUS_COLOR[order.status] + "18",
                color: STATUS_COLOR[order.status], fontWeight: 700,
              }}>
                {STATUS_ICON[order.status]} {order.status}
              </span>
            </div>

            {/* Items - group duplicates */}
            <p style={{ margin: "0 0 6px", color: "#444", fontSize: 14, fontWeight: 500 }}>
              {[...new Set(order.items)].map((item) => {
                const count = order.items.filter((i) => i === item).length
                return count > 1 ? `${item} ×${count}` : item
              }).join(", ")}
            </p>

            {/* Address */}
            <p style={{ margin: "0 0 12px", color: "#888", fontSize: 13 }}>
              📍 {order.address}
              {order.note && (
                <span style={{ display: "block", color: "#f57c00", fontSize: 12, marginTop: 2 }}>
                  💬 {order.note}
                </span>
              )}
            </p>

            {/* Map button */}
            <button
              onClick={() => openMap(order.lat, order.lng)}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10,
                border: "1.5px solid #2196f3", background: "transparent",
                color: "#2196f3", cursor: "pointer", fontSize: 14, fontWeight: 600,
                marginBottom: 10,
              }}
            >
              🗺️ เปิดแผนที่นำทาง
            </button>

            {/* Status buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.filter((s) => s !== order.status).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(order.order_id, s)}
                  disabled={updatingId === order.order_id}
                  style={{
                    flex: 1, minWidth: 80,
                    padding: "8px 10px", borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${STATUS_COLOR[s]}`,
                    background: "transparent", color: STATUS_COLOR[s],
                    cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {STATUS_ICON[s]} {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}