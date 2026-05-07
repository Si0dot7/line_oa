// src/pages/OrderForm.jsx  (~120 บรรทัด จากเดิม 906)
import { useState, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { useToast } from "../hooks/useToast"
import { useMenu } from "../hooks/useMenu"
import { useCustomerOrders } from "../hooks/useCustomerOrders"
import { usePoints } from "../hooks/usePoints"
import { useActiveFlashDeals } from "../hooks/useFlashDeals"
import { useSavedAddresses } from "../hooks/useSavedAddresses"
import { Toast } from "../components/shared/Toast"
import { MenuGrid } from "../components/order/MenuGrid"
import { DeliveryStep } from "../components/order/DeliveryStep"
import { OrderCard } from "../components/order/OrderCard"
import { OrderSuccessScreen } from "../components/order/OrderSuccessScreen"
import { ProfileTab } from "../components/order/ProfileTab"
import { CartSheet } from "../components/order/CartSheet"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function OrderForm({ profile, liff }) {
  const [quantities, setQuantities]   = useState({})
  const [address, setAddress]         = useState("")
  const [note, setNote]               = useState("")
  const [location, setLocation]       = useState(null)
  const [locLoading, setLocLoading]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)
  const [tab, setTab]                 = useState("order")     // order | tracking | profile
  const [orderStep, setOrderStep]     = useState("menu")      // menu | delivery
  const [cartOpen, setCartOpen]       = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [usePointsRedemption, setUsePointsRedemption] = useState(false)

  const { toast, showToast } = useToast(3500)
  const { menuItems, categories, loading: menuLoading } = useMenu()
  const { myOrders, loading: ordersLoading, refetch: refetchOrders } = useCustomerOrders(profile?.userId)
  const { points, setPoints } = usePoints(profile?.userId)
  const { deals } = useActiveFlashDeals()
  const { savedAddresses, saveAddress } = useSavedAddresses(profile?.userId)

  // ── Cart calculations ──────────────────────────────────────────
  const selectedItems  = menuItems.filter((i) => (quantities[i.id] || 0) > 0)
  const itemCount      = selectedItems.reduce((s, i) => s + quantities[i.id], 0)
  const subtotal       = selectedItems.reduce((s, i) => s + i.price * quantities[i.id], 0)
  const deliveryFee    = subtotal >= 150 ? 0 : 25
  const pointsDiscount = usePointsRedemption ? Math.min(points, Math.floor(subtotal * 0.1)) : 0
  const total          = subtotal + deliveryFee - pointsDiscount

  // ── Qty handler ────────────────────────────────────────────────
  const handleQtyChange = useCallback((id, delta, action) => {
    if (action === "clear") { setQuantities({}); return }
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
  }, [])

  // ── GPS ────────────────────────────────────────────────────────
  const getLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false) },
      ()    => { showToast("❌ ไม่สามารถดึง GPS ได้", "error"); setLocLoading(false) }
    )
  }

  // ── Reorder ────────────────────────────────────────────────────
  const reorder = (order) => {
    if (!order.items_detail) return
    const newQty = {}
    for (const item of order.items_detail) {
      const menuItem = menuItems.find((m) => m.id === item.id)
      if (menuItem?.is_available) newQty[item.id] = item.qty
    }
    setQuantities(newQty)
    setAddress(order.address || "")
    setNote(order.note || "")
    setTab("order")
    setOrderStep("menu")
    showToast("🔄 เพิ่มสินค้าเดิมในตะกร้าแล้ว!", "success")
  }

  // ── Submit ─────────────────────────────────────────────────────
  const submit = async () => {
    if (!selectedItems.length) return showToast("❌ กรุณาเลือกสินค้า", "error")
    if (!address.trim())       return showToast("❌ กรุณาใส่ที่อยู่จัดส่ง", "error")
    if (!location)             return showToast("❌ กรุณาดึงตำแหน่ง GPS ก่อน", "error")

    setSubmitting(true)
    try {
      const itemNames   = selectedItems.flatMap((i) => Array(quantities[i.id]).fill(i.name))
      const itemsDetail = selectedItems.map((i) => ({ id: i.id, name: i.name, qty: quantities[i.id], price: i.price, emoji: i.emoji }))

      const { data: inserted, error: dbErr } = await supabase
        .from("orders")
        .insert({
          user_id: profile?.userId || "guest", display_name: profile?.displayName || "ลูกค้า",
          items: itemNames, items_detail: itemsDetail,
          total_price: total, subtotal, delivery_fee: deliveryFee, points_used: pointsDiscount,
          payment_method: paymentMethod, lat: location.lat, lng: location.lng,
          address: address.trim(), note: note.trim(), status: "รอร้านยืนยัน",
        })
        .select()
        .single()

      if (dbErr) throw new Error(dbErr.message)

      if (pointsDiscount > 0) {
        await supabase.from("user_points").upsert(
          { user_id: profile.userId, points: points - pointsDiscount },
          { onConflict: "user_id" }
        )
        setPoints(points - pointsDiscount)
      }

      await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: inserted.id, user_id: profile?.userId || "guest", items: itemNames, lat: location.lat, lng: location.lng, address: address.trim(), note: note.trim(), total_price: total, payment_method: paymentMethod }),
      }).catch(() => {})

      await saveAddress(address.trim())
      setCompletedOrder({ ...inserted, order_id: inserted.id })
      setQuantities({})
      setAddress("")
      setNote("")
      setLocation(null)
      setOrderStep("menu")
      setUsePointsRedemption(false)
      refetchOrders()
    } catch (e) {
      showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error")
    }
    setSubmitting(false)
  }

  // ── Success screen ─────────────────────────────────────────────
  if (completedOrder) {
    return (
      <OrderSuccessScreen
        order={completedOrder}
        total={total}
        deliveryFee={deliveryFee}
        subtotal={subtotal}
        onTrack={() => { setCompletedOrder(null); setTab("tracking") }}
        onOrderAgain={() => { setCompletedOrder(null); setTab("order") }}
      />
    )
  }

  const activeOrderCount = myOrders.filter((o) => o.status !== "ส่งสำเร็จ").length

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Toast toast={toast} />

      {cartOpen && (
        <CartSheet
          selectedItems={selectedItems}
          quantities={quantities}
          total={total}
          onQtyChange={handleQtyChange}
          onCheckout={() => { setCartOpen(false); setOrderStep("delivery") }}
          onClose={() => setCartOpen(false)}
        />
      )}

      {/* Tab Content */}
      {tab === "order" && orderStep === "menu" && (
        <MenuGrid
          menuItems={menuItems}
          deals={deals}
          categories={categories}
          quantities={quantities}
          onQtyChange={handleQtyChange}
        />
      )}

      {tab === "order" && orderStep === "delivery" && (
        <DeliveryStep
          address={address} setAddress={setAddress}
          note={note} setNote={setNote}
          location={location} locLoading={locLoading} onGetLocation={getLocation}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          points={points} subtotal={subtotal} deliveryFee={deliveryFee}
          pointsDiscount={pointsDiscount} total={total}
          usePointsRedemption={usePointsRedemption} setUsePointsRedemption={setUsePointsRedemption}
          selectedItems={selectedItems} quantities={quantities}
          savedAddresses={savedAddresses}
          submitting={submitting} onSubmit={submit}
          onBack={() => setOrderStep("menu")}
        />
      )}

      {tab === "tracking" && (
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-800 font-bold text-base">ออเดอร์ของฉัน</h2>
            <button onClick={refetchOrders} className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              🔄 รีเฟรช
            </button>
          </div>
          {ordersLoading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400 mb-5">ยังไม่มีออเดอร์</p>
              <button onClick={() => setTab("order")} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95">สั่งสินค้าเลย</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myOrders.map((order) => (
                <OrderCard key={order.id} order={order} onReorder={() => reorder(order)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "profile" && (
        <ProfileTab
          profile={profile}
          points={points}
          myOrders={myOrders}
          savedAddresses={savedAddresses}
          onUseAddress={(addr) => { setAddress(addr); setTab("order") }}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 shadow-2xl z-30">
        {tab === "order" && orderStep === "menu" && itemCount > 0 && (
          <div className="px-4 pt-3">
            <button onClick={() => setOrderStep("delivery")}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-between px-5">
              <div className="bg-white bg-opacity-20 w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm">{itemCount}</div>
              <span>ดำเนินการสั่งซื้อ</span>
              <span className="font-black">{total}฿</span>
            </button>
          </div>
        )}
        <div className="flex py-2 px-2">
          {[
            { id: "order",    icon: "🛍️", label: "สั่งสินค้า" },
            { id: "tracking", icon: "📦", label: "ติดตาม",    badge: activeOrderCount },
            { id: "profile",  icon: "👤", label: "โปรไฟล์"   },
          ].map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "order") setOrderStep("menu") }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all relative ${tab === t.id ? "text-blue-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {t.badge > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}