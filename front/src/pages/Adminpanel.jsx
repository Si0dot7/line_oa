// src/pages/Adminpanel.jsx  (ไม่เปลี่ยนแปลงมาก เพราะสั้นอยู่แล้ว — เพิ่ม Toggle shared)
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Toggle } from "../components/shared/Toggle"

const ROLES = ["customer", "merchant", "rider", "admin"]
const ROLE_LABELS = { customer: "👤 ลูกค้า", merchant: "🏪 ร้านค้า", rider: "🛵 ไรเดอร์", admin: "🔑 แอดมิน" }
const ROLE_COLORS = { customer: "bg-blue-100 text-blue-700", merchant: "bg-indigo-100 text-indigo-700", rider: "bg-orange-100 text-orange-700", admin: "bg-red-100 text-red-700" }

export default function AdminPanel({ profile }) {
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState("")
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from("users")
      .select("line_user_id, display_name, picture_url, role, is_active, last_seen, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
    setUsers(data || [])
    setLoading(false)
  }

  async function updateRole(userId, newRole) {
    setSaving(userId + "_role")
    await supabase.from("users").update({ role: newRole }).eq("line_user_id", userId)
    setUsers((u) => u.map((x) => x.line_user_id === userId ? { ...x, role: newRole } : x))
    setSaving(null)
  }

  async function toggleActive(userId, current) {
    setSaving(userId + "_active")
    await supabase.from("users").update({ is_active: !current }).eq("line_user_id", userId)
    setUsers((u) => u.map((x) => x.line_user_id === userId ? { ...x, is_active: !current } : x))
    setSaving(null)
  }

  const filtered = users.filter((u) =>
    !search ||
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.line_user_id?.includes(search)
  )

  const stats = {
    total:    users.length,
    merchant: users.filter((u) => u.role === "merchant").length,
    rider:    users.filter((u) => u.role === "rider").length,
    active:   users.filter((u) => u.is_active).length,
  }

  return (
    <div className="p-4 pb-10">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "ทั้งหมด", value: stats.total,    color: "bg-gray-100 text-gray-700"     },
          { label: "ร้านค้า",  value: stats.merchant, color: "bg-indigo-100 text-indigo-700" },
          { label: "ไรเดอร์",  value: stats.rider,    color: "bg-orange-100 text-orange-700" },
          { label: "Active",  value: stats.active,   color: "bg-green-100 text-green-700"   },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
            <div className="font-bold text-lg leading-none">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ / userId..."
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ไม่พบ user</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <UserCard
              key={u.line_user_id}
              user={u}
              saving={saving}
              onRoleChange={updateRole}
              onToggleActive={toggleActive}
              isSelf={u.line_user_id === profile?.userId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({ user, saving, onRoleChange, onToggleActive, isSelf }) {
  const [expanded, setExpanded] = useState(false)
  const lastSeen = user.last_seen
    ? new Date(user.last_seen).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "ไม่ทราบ"

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${!user.is_active ? "opacity-60 border-gray-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        {user.picture_url
          ? <img src={user.picture_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
          : <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold flex-shrink-0">{user.display_name?.[0] || "?"}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800 truncate">{user.display_name || "ไม่ระบุชื่อ"}</span>
            {isSelf && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">ฉัน</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-500"}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            {!user.is_active && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">ปิดใช้งาน</span>}
          </div>
        </div>
        <span className="text-gray-300 text-lg">{expanded ? "∧" : "∨"}</span>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-50 pt-3 space-y-3">
          <p className="text-xs text-gray-400">เข้าใช้ล่าสุด: {lastSeen}</p>

          {/* Role selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">เปลี่ยน Role</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button key={r}
                  disabled={saving === user.line_user_id + "_role"}
                  onClick={() => onRoleChange(user.line_user_id, r)}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all
                    ${user.role === r ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">สถานะบัญชี</span>
            <button
              disabled={isSelf || saving === user.line_user_id + "_active"}
              onClick={() => onToggleActive(user.line_user_id, user.is_active)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all
                ${user.is_active ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"}
                disabled:opacity-40`}>
              {user.is_active ? "🚫 ปิดใช้งาน" : "✅ เปิดใช้งาน"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}