import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const MENU_ITEMS = [
  { id: 1, name: "ข้าวมันไก่", price: 50, emoji: "🍗", desc: "ไก่ต้มนุ่ม น้ำซุปหอม" },
  { id: 2, name: "ข้าวหมูแดง", price: 55, emoji: "🍖", desc: "หมูแดงหวานกลมกล่อม" },
  { id: 3, name: "ผัดไทย", price: 60, emoji: "🍜", desc: "เส้นหนาผัดไฟแรง" },
  { id: 4, name: "ส้มตำ", price: 45, emoji: "🌶️", desc: "เผ็ดหอมมะนาว" },
  { id: 5, name: "ข้าวผัดกระเพรา", price: 55, emoji: "🌿", desc: "กระเพราหมูสับไข่ดาว" },
  { id: 6, name: "ต้มยำกุ้ง", price: 80, emoji: "🦐", desc: "ต้มยำน้ำข้นรสจัด" },
]

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

export default function OrderForm({ profile }) {
  const [quantities, setQuantities] = useState({})
  const [address, setAddress] = useState("")
  const [note, setNote] = useState("")
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [myOrders, setMyOrders] = useState([])
  const [tab, setTab] = useState("order") // "order" | "tracking"

  // โหลดออเดอร์ของลูกค้า
  const fetchMyOrders = async () => {
    if (!profile?.userId) return
    try {
      const res = await fetch(`${API_URL}/orders`)
      const all = await res.json()
      const mine = all.filter((o) => o.user_id === profile.userId).reverse()
      setMyOrders(mine)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMyOrders()
    const interval = setInterval(fetchMyOrders, 10000)
    return () => clearInterval(interval)
  }, [profile])

  const setQty = (id, delta) => {
    setQuantities((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: next }
    })
  }

  const selectedItems = MENU_ITEMS.filter((i) => (quantities[i.id] || 0) > 0)
  const total = selectedItems.reduce((sum, i) => sum + i.price * (quantities[i.id] || 0), 0)

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

  const submit = async () => {
    if (!selectedItems.length) return alert("กรุณาเลือกสินค้า")
    if (!address) return alert("กรุณาใส่ที่อยู่")
    if (!location) return alert("กรุณากดดึง GPS ก่อน")

    setSubmitting(true)
    try {
      const itemNames = selectedItems.flatMap((i) =>
        Array(quantities[i.id]).fill(i.name)
      )
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile?.userId || "guest",
          items: itemNames,
          lat: location.lat,
          lng: location.lng,
          address,
          note,
        }),
      })
      const data = await res.json()
      setCompletedOrder(data.order_id)
      fetchMyOrders()
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + e.message)
    }
    setSubmitting(false)
  }

  // หน้าสำเร็จ
  if (completedOrder) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#e8f5e9", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40,
        }}>✅</div>
        <h2 style={{ color: "#06C755", marginBottom: 8 }}>สั่งสำเร็จ!</h2>
        <div style={{
          background: "#f5f5f5", borderRadius: 12, padding: 16,
          marginBottom: 20, textAlign: "left",
        }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#333" }}>เลขออเดอร์: {completedOrder}</p>
          <p style={{ margin: "0 0 4px", color: "#666", fontSize: 14 }}>
            {selectedItems.map((i) => `${i.name} x${quantities[i.id]}`).join(", ")}
          </p>
          <p style={{ margin: 0, color: "#06C755", fontWeight: 600 }}>ยอดรวม {total} ฿</p>
        </div>
        <p style={{ color: "#888", marginBottom: 20 }}>จะแจ้งเตือนสถานะผ่าน LINE นะครับ</p>
        <button
          onClick={() => {
            setCompletedOrder(null)
            setQuantities({})
            setAddress("")
            setNote("")
            setTab("tracking")
          }}
          style={btnStyle("#06C755")}
        >
          ติดตามออเดอร์
        </button>
        <button
          onClick={() => { setCompletedOrder(null); setQuantities({}); setAddress(""); setNote("") }}
          style={{ ...btnStyle("#2196f3"), marginTop: 10 }}
        >
          สั่งเพิ่ม
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee" }}>
        {[
          { key: "order", label: "🛵 สั่งสินค้า" },
          { key: "tracking", label: `📦 ติดตาม${myOrders.length > 0 ? ` (${myOrders.length})` : ""}` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "14px 0", border: "none",
              background: "transparent", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              color: tab === t.key ? "#06C755" : "#999",
              borderBottom: tab === t.key ? "2.5px solid #06C755" : "2.5px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "order" && (
        <div style={{ padding: 16 }}>
          {/* Greeting */}
          <div style={{
            background: "linear-gradient(135deg, #06C755, #04a844)",
            borderRadius: 12, padding: 16, marginBottom: 20, color: "#fff",
          }}>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>สวัสดีครับ 👋</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{profile?.displayName || "ลูกค้า"}</p>
          </div>

          {/* Menu */}
          <h3 style={{ margin: "0 0 12px", color: "#333", fontSize: 16 }}>🍽️ เลือกเมนู</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {MENU_ITEMS.map((item) => {
              const qty = quantities[item.id] || 0
              return (
                <div
                  key={item.id}
                  style={{
                    background: "#fff", borderRadius: 12, padding: "12px 14px",
                    border: `2px solid ${qty > 0 ? "#06C755" : "#e0e0e0"}`,
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#333", fontSize: 15 }}>{item.name}</div>
                    <div style={{ color: "#999", fontSize: 12 }}>{item.desc}</div>
                  </div>
                  <div style={{ color: "#06C755", fontWeight: 700, fontSize: 14, minWidth: 40, textAlign: "right" }}>
                    {item.price}฿
                  </div>
                  {/* Quantity control */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => setQty(item.id, -1)}
                          style={qtyBtnStyle("#ff5252")}
                        >−</button>
                        <span style={{ fontWeight: 700, color: "#333", minWidth: 18, textAlign: "center" }}>{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => setQty(item.id, 1)}
                      style={qtyBtnStyle("#06C755")}
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Address */}
          <h3 style={{ margin: "0 0 8px", color: "#333", fontSize: 16 }}>📍 ที่อยู่จัดส่ง</h3>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="บ้านเลขที่, ซอย, ถนน, แขวง, เขต..."
            rows={2}
            style={{
              width: "100%", padding: 12, borderRadius: 10,
              border: "1.5px solid #e0e0e0", fontSize: 14,
              boxSizing: "border-box", resize: "none", marginBottom: 10,
              fontFamily: "inherit",
            }}
          />

          {/* GPS Button */}
          <button
            onClick={getLocation}
            disabled={locLoading}
            style={{
              ...btnStyle(location ? "#4caf50" : "#2196f3", true),
              marginBottom: 10,
            }}
          >
            {locLoading
              ? "⏳ กำลังดึง GPS..."
              : location
              ? `✅ GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : "📡 ดึงตำแหน่ง GPS"}
          </button>

          {/* Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="💬 หมายเหตุ เช่น ไม่ใส่ผักชี, ฝากไว้หน้าบ้าน"
            style={{
              width: "100%", padding: 12, borderRadius: 10,
              border: "1.5px solid #e0e0e0", fontSize: 14,
              boxSizing: "border-box", marginBottom: 20, fontFamily: "inherit",
            }}
          />

          {/* Summary */}
          {selectedItems.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: 12, padding: 16,
              border: "1.5px solid #e8f5e9", marginBottom: 16,
              boxShadow: "0 2px 8px rgba(6,199,85,0.1)",
            }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#333" }}>🧾 สรุปออเดอร์</p>
              {selectedItems.map((i) => (
                <div key={i.id} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 14, color: "#555", marginBottom: 4,
                }}>
                  <span>{i.emoji} {i.name} × {quantities[i.id]}</span>
                  <span>{i.price * quantities[i.id]} ฿</span>
                </div>
              ))}
              <div style={{
                borderTop: "1.5px dashed #e0e0e0", marginTop: 10, paddingTop: 10,
                display: "flex", justifyContent: "space-between",
                fontWeight: 700, color: "#06C755", fontSize: 16,
              }}>
                <span>รวมทั้งหมด</span>
                <span>{total} ฿</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting || !selectedItems.length}
            style={{
              ...btnStyle("#06C755"),
              opacity: (!selectedItems.length || submitting) ? 0.5 : 1,
            }}
          >
            {submitting ? "⏳ กำลังส่งออเดอร์..." : selectedItems.length ? `🛵 สั่งเลย (${total} ฿)` : "กรุณาเลือกสินค้า"}
          </button>
        </div>
      )}

      {tab === "tracking" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "#333" }}>ออเดอร์ของฉัน</h3>
            <button
              onClick={fetchMyOrders}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: "1.5px solid #06C755", background: "transparent",
                color: "#06C755", cursor: "pointer", fontSize: 13,
              }}
            >รีเฟรช</button>
          </div>

          {myOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>ยังไม่มีออเดอร์</p>
              <button
                onClick={() => setTab("order")}
                style={{ ...btnStyle("#06C755"), width: "auto", padding: "10px 24px" }}
              >สั่งสินค้าเลย</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myOrders.map((order) => (
                <OrderCard key={order.order_id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }) {
  const color = STATUS_COLOR[order.status] || "#888"
  const icon = STATUS_ICON[order.status] || "📦"
  const steps = ["รอร้านยืนยัน", "กำลังทำ", "กำลังจัดส่ง", "ส่งสำเร็จ"]
  const stepIdx = steps.indexOf(order.status)

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16,
      border: "1.5px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: "#333" }}>{order.order_id}</span>
        <span style={{
          fontSize: 12, padding: "4px 12px", borderRadius: 20,
          background: color + "18", color, fontWeight: 700,
        }}>
          {icon} {order.status}
        </span>
      </div>

      {/* Items */}
      <p style={{ margin: "0 0 6px", color: "#555", fontSize: 14 }}>
        {[...new Set(order.items)].map((item) => {
          const count = order.items.filter((i) => i === item).length
          return count > 1 ? `${item} ×${count}` : item
        }).join(", ")}
      </p>

      {/* Address */}
      <p style={{ margin: "0 0 12px", color: "#999", fontSize: 12 }}>
        📍 {order.address}
        {order.note && ` · ${order.note}`}
      </p>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{
              height: 4, borderRadius: 4,
              background: i <= stepIdx ? color : "#e0e0e0",
              transition: "background 0.3s",
            }} />
            {i === stepIdx && (
              <p style={{ margin: "4px 0 0", fontSize: 10, color, textAlign: "center", lineHeight: 1.2 }}>
                {s}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const btnStyle = (color, outline = false) => ({
  width: "100%", padding: "14px 0", borderRadius: 12,
  border: outline ? `2px solid ${color}` : "none",
  background: outline ? "transparent" : color,
  color: outline ? color : "#fff",
  fontSize: 16, fontWeight: 700, cursor: "pointer",
})

const qtyBtnStyle = (color) => ({
  width: 28, height: 28, borderRadius: 8,
  border: `2px solid ${color}`,
  background: "transparent", color,
  fontSize: 18, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1, padding: 0,
})