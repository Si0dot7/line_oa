// src/pages/MerchantDashboard.jsx  (~120 บรรทัด จากเดิม 828)
import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useToast } from "../hooks/useToast"
import { useRealtimeOrders } from "../hooks/useRealtimeOrders"
import { useMenuManagement } from "../hooks/useMenuManagement"
import { useMerchantFlashDeals } from "../hooks/useFlashDeals"
import { Toast } from "../components/shared/Toast"
import { OrdersTab } from "../components/merchant/OrdersTab"
import { MenuTab } from "../components/merchant/MenuTab"
import { DealsTab } from "../components/merchant/DealsTab"
import { AnalyticsTab } from "../components/merchant/AnalyticsTab"
import { MenuForm } from "../components/merchant/MenuForm"
import { DealForm } from "../components/merchant/DealForm"
import { STATUS_OPTIONS, STATUS_META } from "../constants/orderStatus"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const MENU_FORM_DEFAULT = { name: "", price: "", emoji: "🍽️", category: "ข้าว", description: "", is_available: true, is_popular: false }
const DEAL_FORM_DEFAULT = { menu_item_id: "", discount_percent: 10, start_at: "", end_at: "" }

const DASH_TABS = [
  { id: "orders",    label: "ออเดอร์",   icon: "📋" },
  { id: "menu",      label: "จัดการเมนู", icon: "🍽️" },
  { id: "deals",     label: "Flash Deal", icon: "⚡" },
  { id: "analytics", label: "สถิติ",     icon: "📊" },
]

export default function MerchantDashboard({ profile }) {
  const [dashTab, setDashTab] = useState("orders")
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [editingItem, setEditingItem]   = useState(null)
  const [menuForm, setMenuForm]         = useState(MENU_FORM_DEFAULT)
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealForm, setDealForm]         = useState(DEAL_FORM_DEFAULT)

  const { toast, showToast } = useToast()
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useRealtimeOrders()
  const { menuItems, loading: menuLoading, addItem, updateItem, deleteItem, toggleAvailable } = useMenuManagement()
  const { deals, addDeal, removeDeal } = useMerchantFlashDeals()

  // ── Stats ──────────────────────────────────────────────────────
  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length
    return acc
  }, {})
  const pendingCount = stats["รอร้านยืนยัน"]
  const todayRevenue = orders
    .filter((o) => o.status === "ส่งสำเร็จ" && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (o.total_price || 0), 0)

  // ── Order Update ───────────────────────────────────────────────
  const updateStatus = async (orderId, status) => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)
      if (error) throw new Error(error.message)

      const order = orders.find((o) => o.id === orderId)
      if (order) {
        await fetch(`${API_URL}/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, user_id: order.user_id }),
        }).catch(() => {})
      }

      if (status === "ส่งสำเร็จ" && order) {
        const earned = Math.floor((order.subtotal || order.total_price || 0) / 10)
        if (earned > 0) {
          const { data: existing } = await supabase.from("user_points").select("points").eq("user_id", order.user_id).single()
          await supabase.from("user_points").upsert(
            { user_id: order.user_id, points: (existing?.points || 0) + earned },
            { onConflict: "user_id" }
          )
        }
      }
      showToast(`✅ อัปเดตเป็น "${status}" แล้ว`)
    } catch (e) {
      showToast("❌ " + e.message, "error")
    }
  }

  // ── Menu CRUD ──────────────────────────────────────────────────
  const openAddMenu = () => { setEditingItem(null); setMenuForm(MENU_FORM_DEFAULT); setShowMenuForm(true) }
  const openEditMenu = (item) => {
    setEditingItem(item)
    setMenuForm({ name: item.name, price: String(item.price), emoji: item.emoji || "🍽️", category: item.category || "ข้าว", description: item.description || "", is_available: item.is_available, is_popular: item.is_popular || false })
    setShowMenuForm(true)
  }
  const saveMenu = async () => {
    if (!menuForm.name.trim())                  return showToast("❌ กรุณาใส่ชื่อเมนู", "error")
    if (!menuForm.price || isNaN(menuForm.price)) return showToast("❌ กรุณาใส่ราคาที่ถูกต้อง", "error")
    try {
      const payload = { ...menuForm, price: parseFloat(menuForm.price) }
      if (editingItem) { await updateItem(editingItem.id, payload); showToast("✅ แก้ไขเมนูแล้ว") }
      else             { await addItem(payload);                     showToast("✅ เพิ่มเมนูแล้ว") }
      setShowMenuForm(false)
    } catch (e) { showToast("❌ " + e.message, "error") }
  }
  const confirmDelete = async (item) => {
    if (!window.confirm(`ลบ "${item.name}" ออกจากเมนู?`)) return
    try { await deleteItem(item.id); showToast("🗑️ ลบแล้ว") }
    catch (e) { showToast("❌ " + e.message, "error") }
  }

  // ── Deal ───────────────────────────────────────────────────────
  const saveDeal = async () => {
    if (!dealForm.menu_item_id)              return showToast("❌ เลือกเมนูก่อน", "error")
    if (!dealForm.start_at || !dealForm.end_at) return showToast("❌ ระบุเวลาก่อน", "error")
    try { await addDeal(dealForm); setShowDealForm(false); showToast("⚡ เพิ่ม Flash Deal แล้ว!") }
    catch (e) { showToast("❌ " + e.message, "error") }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toast toast={toast} />

      {showMenuForm && <MenuForm form={menuForm} setForm={setMenuForm} editingItem={editingItem} onSave={saveMenu} onClose={() => setShowMenuForm(false)} />}
      {showDealForm && <DealForm form={dealForm} setForm={setDealForm} menuItems={menuItems} onSave={saveDeal} onClose={() => setShowDealForm(false)} />}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-xs">แดชบอร์ดร้านค้า</p>
            <p className="text-white font-black text-lg">จัดการออเดอร์ 📋</p>
          </div>
          <div className="text-right">
            {pendingCount > 0 && <div className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse mb-1">🔔 {pendingCount} ใหม่!</div>}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((s) => (
            <div key={s} className="bg-white bg-opacity-15 rounded-xl p-2 text-center">
              <p className="font-black text-xl leading-none">{stats[s]}</p>
              <p className="text-[10px] mt-0.5">{STATUS_META[s].icon}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-white bg-opacity-15 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm">💰 รายได้วันนี้</p>
          <p className="font-black text-lg">{todayRevenue.toLocaleString()}฿</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[52px] z-10">
        <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1">
          {DASH_TABS.map((t) => (
            <button key={t.id} onClick={() => setDashTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 relative
                ${dashTab === t.id ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-500"}`}>
              {t.icon} {t.label}
              {t.id === "orders" && pendingCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-0.5">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {dashTab === "orders"    && <OrdersTab    orders={orders} loading={ordersLoading} onUpdateStatus={updateStatus} onRefetch={refetchOrders} />}
      {dashTab === "menu"      && <MenuTab      menuItems={menuItems} loading={menuLoading} onAdd={openAddMenu} onEdit={openEditMenu} onDelete={confirmDelete} onToggleAvailable={toggleAvailable} />}
      {dashTab === "deals"     && <DealsTab     deals={deals} onCreateDeal={() => setShowDealForm(true)} onRemoveDeal={removeDeal} />}
      {dashTab === "analytics" && <AnalyticsTab orders={orders} menuItems={menuItems} todayRevenue={todayRevenue} stats={stats} />}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 shadow-xl z-20">
        <div className="flex py-2 px-2">
          {DASH_TABS.map((t) => (
            <button key={t.id} onClick={() => setDashTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all relative ${dashTab === t.id ? "text-indigo-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {t.id === "orders" && pendingCount > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}