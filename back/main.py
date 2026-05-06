import os
import hmac
import hashlib
import base64
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="LINE Delivery Backend v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LINE_CHANNEL_SECRET       = os.environ.get("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_API                  = "https://api.line.me/v2/bot"
LIFF_ID                   = os.environ.get("LIFF_ID", "")
SUPABASE_URL              = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY      = os.environ.get("SUPABASE_SERVICE_KEY", "")   # service_role key (server-side only)


# ── Supabase helpers ────────────────────────────────────────────────
def sb_headers():
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }

async def sb_get(table: str, params: dict = None):
    """GET from Supabase REST API"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    query = "&".join(f"{k}={v}" for k, v in (params or {}).items())
    url = f"{SUPABASE_URL}/rest/v1/{table}{'?' + query if query else ''}"
    async with httpx.AsyncClient() as c:
        res = await c.get(url, headers=sb_headers())
        return res.json() if res.status_code == 200 else []

async def sb_patch(table: str, match: dict, data: dict):
    """PATCH a row in Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    query = "&".join(f"{k}=eq.{v}" for k, v in match.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    async with httpx.AsyncClient() as c:
        res = await c.patch(url, headers=sb_headers(), json=data)
        return res.json()


# ── LINE Helpers ────────────────────────────────────────────────────
def verify_line_signature(body: bytes, signature: str) -> bool:
    mac = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    return hmac.compare_digest(base64.b64encode(mac).decode("utf-8"), signature)


async def push_message(user_id: str, messages: list):
    """ส่ง Push Message (รับ list of message objects)"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print(f"[push] No token — {user_id}: {messages}")
        return 200
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as c:
        res = await c.post(f"{LINE_API}/message/push", json={"to": user_id, "messages": messages}, headers=headers)
        if res.status_code != 200:
            print(f"[push] Error {res.status_code}: {res.text}")
        return res.status_code


async def reply_message(reply_token: str, messages: list):
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print(f"[reply] No token: {messages}")
        return 200
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as c:
        res = await c.post(f"{LINE_API}/message/reply", json={"replyToken": reply_token, "messages": messages}, headers=headers)
        return res.status_code


# ── Flex Message builders ───────────────────────────────────────────
def liff_url(mode="order"):
    base = f"https://liff.line.me/{LIFF_ID}" if LIFF_ID else "https://example.com"
    return f"{base}?mode={mode}"


def make_order_confirmed_flex(order: dict) -> dict:
    """Flex แจ้งลูกค้าว่ารับออเดอร์แล้ว"""
    items_text = ", ".join(order.get("items", []))
    total = order.get("total_price", 0)
    short_id = str(order.get("order_id", ""))[-6:].upper()
    payment_map = {"cash": "💵 เงินสด", "transfer": "🏦 โอนเงิน", "promptpay": "📱 PromptPay"}
    payment_label = payment_map.get(order.get("payment_method", "cash"), "💵 เงินสด")

    return {
        "type": "flex",
        "altText": f"✅ รับออเดอร์ #{short_id} แล้ว!",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box", "layout": "vertical",
                "backgroundColor": "#4CAF50", "paddingAll": "16px",
                "contents": [
                    {"type": "text", "text": "✅ รับออเดอร์แล้ว!", "color": "#ffffff", "weight": "bold", "size": "xl"},
                    {"type": "text", "text": f"เลขออเดอร์ #{short_id}", "color": "#c8f7c5", "size": "sm", "margin": "sm"},
                ]
            },
            "body": {
                "type": "box", "layout": "vertical", "paddingAll": "16px",
                "contents": [
                    {"type": "text", "text": "รายการอาหาร", "weight": "bold", "color": "#555555", "size": "sm"},
                    {"type": "text", "text": items_text, "size": "sm", "color": "#333333", "wrap": True, "margin": "sm"},
                    {"type": "separator", "margin": "md"},
                    {
                        "type": "box", "layout": "horizontal", "margin": "md",
                        "contents": [
                            {"type": "text", "text": "ยอดรวม", "size": "sm", "color": "#888888", "flex": 3},
                            {"type": "text", "text": f"{total}฿", "size": "sm", "weight": "bold", "flex": 2, "align": "end"},
                        ]
                    },
                    {
                        "type": "box", "layout": "horizontal", "margin": "xs",
                        "contents": [
                            {"type": "text", "text": "ชำระเงิน", "size": "sm", "color": "#888888", "flex": 3},
                            {"type": "text", "text": payment_label, "size": "sm", "flex": 2, "align": "end"},
                        ]
                    },
                    {
                        "type": "box", "layout": "horizontal", "margin": "xs",
                        "contents": [
                            {"type": "text", "text": "ที่อยู่", "size": "sm", "color": "#888888", "flex": 3},
                            {"type": "text", "text": order.get("address", ""), "size": "sm", "flex": 4, "wrap": True, "align": "end"},
                        ]
                    },
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "paddingAll": "12px",
                "contents": [{
                    "type": "button", "style": "primary", "color": "#1E88E5",
                    "action": {"type": "uri", "label": "📦 ติดตามออเดอร์", "uri": liff_url("order")}
                }]
            }
        }
    }


def make_status_update_flex(order_id: str, status: str, items_text: str = "") -> dict:
    STATUS_COLOR = {"รอร้านยืนยัน": "#ff9800", "กำลังทำ": "#2196f3", "กำลังจัดส่ง": "#9c27b0", "ส่งสำเร็จ": "#4caf50"}
    STATUS_ICON  = {"รอร้านยืนยัน": "⏳", "กำลังทำ": "👨‍🍳", "กำลังจัดส่ง": "🛵", "ส่งสำเร็จ": "✅"}
    STATUS_MSG   = {
        "รอร้านยืนยัน": "ร้านค้ากำลังตรวจสอบออเดอร์ของคุณ",
        "กำลังทำ":      "ร้านกำลังเตรียมอาหาร รอสักครู่นะคะ 🍳",
        "กำลังจัดส่ง": "พนักงานกำลังนำส่งถึงที่อยู่คุณ 🛵",
        "ส่งสำเร็จ":   "ได้รับสินค้าแล้ว! ขอบคุณที่ใช้บริการ 😊",
    }
    color = STATUS_COLOR.get(status, "#888888")
    icon  = STATUS_ICON.get(status, "📦")
    msg   = STATUS_MSG.get(status, "")
    short_id = str(order_id)[-6:].upper()

    return {
        "type": "flex",
        "altText": f"{icon} ออเดอร์ #{short_id}: {status}",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box", "layout": "vertical",
                "backgroundColor": color, "paddingAll": "14px",
                "contents": [
                    {"type": "text", "text": f"{icon} {status}", "color": "#ffffff", "weight": "bold", "size": "lg"},
                    {"type": "text", "text": f"ออเดอร์ #{short_id}", "color": "#ffffffcc", "size": "xs", "margin": "xs"},
                ]
            },
            "body": {
                "type": "box", "layout": "vertical", "paddingAll": "14px",
                "contents": [
                    {"type": "text", "text": msg, "size": "sm", "color": "#444444", "wrap": True},
                    *(
                        [{"type": "text", "text": items_text, "size": "xs", "color": "#888888", "margin": "sm", "wrap": True}]
                        if items_text else []
                    )
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "paddingAll": "10px",
                "contents": [{
                    "type": "button", "style": "link", "height": "sm",
                    "action": {"type": "uri", "label": "ดูรายละเอียด", "uri": liff_url("order")}
                }]
            }
        }
    }


def make_order_button_flex(label="สั่งสินค้า"):
    return {
        "type": "flex",
        "altText": "กดปุ่มเพื่อสั่งสินค้า",
        "contents": {
            "type": "bubble",
            "hero": {
                "type": "box", "layout": "vertical",
                "backgroundColor": "#1565C0", "paddingAll": "20px",
                "contents": [
                    {"type": "text", "text": "🛵 Delivery", "color": "#ffffff", "weight": "bold", "size": "xxl"},
                    {"type": "text", "text": "อาหารสดใหม่ ส่งถึงบ้าน", "color": "#90CAF9", "size": "sm", "margin": "sm"},
                ]
            },
            "body": {
                "type": "box", "layout": "vertical", "paddingAll": "16px",
                "contents": [
                    {
                        "type": "box", "layout": "horizontal",
                        "contents": [
                            {"type": "text", "text": "⚡ ส่งไวทันใจ", "size": "xs", "color": "#555555", "flex": 1},
                            {"type": "text", "text": "🎁 ฟรีค่าส่ง ", "size": "xs", "color": "#555555", "flex": 1},
                        ]
                    }
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "paddingAll": "10px",
                "contents": [{
                    "type": "button", "style": "primary", "color": "#1E88E5", "height": "md",
                    "action": {"type": "uri", "label": label, "uri": liff_url("order")}
                }]
            }
        }
    }


def _quick_reply_items():
    return [
        {"type": "action", "action": {"type": "message", "label": "🛵 สั่งสินค้า", "text": "สั่งสินค้า"}},
        {"type": "action", "action": {"type": "message", "label": "📦 เช็คสถานะ", "text": "สถานะ"}},
        {"type": "action", "action": {"type": "message", "label": "🏪 หน้าร้านค้า", "text": "ร้านค้า"}},
        {"type": "action", "action": {"type": "message", "label": "❓ ช่วยเหลือ",   "text": "ช่วยเหลือ"}},
    ]


# ── Rich Menu ───────────────────────────────────────────────────────
# ── แทนที่ฟังก์ชัน ensure_rich_menu() เดิมทั้งหมดด้วยโค้ดนี้ ──────────

def ensure_rich_menu():
    if not LINE_CHANNEL_ACCESS_TOKEN or not LIFF_ID:
        print("⚠️ ข้าม Rich Menu (ไม่มี token หรือ LIFF_ID)")
        return

    headers              = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}", "Content-Type": "application/json"}
    current_order_url    = liff_url("order")
    current_merchant_url = liff_url("merchant")

    # ── ตรวจว่ามี menu ที่ถูกต้องอยู่แล้วหรือไม่ ──────────────────────
    res   = httpx.get("https://api.line.me/v2/bot/richmenu/list", headers=headers)
    menus = res.json().get("richmenus", [])

    for menu in menus:
        areas = menu.get("areas", [])
        if len(areas) >= 2:
            if (areas[0].get("action", {}).get("uri") == current_order_url and
                areas[1].get("action", {}).get("uri") == current_merchant_url):
                print(f"✅ Rich Menu OK (ID: {menu['richMenuId']})")
                return

    # ── ลบ menu เก่าทั้งหมด ────────────────────────────────────────────
    print("🔄 สร้าง Rich Menu ใหม่...")
    for menu in menus:
        httpx.delete(f"https://api.line.me/v2/bot/richmenu/{menu['richMenuId']}", headers=headers)

    # ── สร้าง menu structure ───────────────────────────────────────────
    payload = {
        "size": {"width": 2500, "height": 843},
        "selected": True,
        "name": "Delivery Menu v2",
        "chatBarText": "เมนู 🛵",
        "areas": [
            {"bounds": {"x": 0,    "y": 0, "width": 1250, "height": 843}, "action": {"type": "uri", "label": "สั่งสินค้า",   "uri": current_order_url}},
            {"bounds": {"x": 1250, "y": 0, "width": 1250, "height": 843}, "action": {"type": "uri", "label": "หน้าร้านค้า", "uri": current_merchant_url}},
        ]
    }
    res = httpx.post("https://api.line.me/v2/bot/richmenu", headers=headers, json=payload)
    if res.status_code != 200:
        print(f"❌ สร้าง Rich Menu ไม่สำเร็จ: {res.text}")
        return
    rid = res.json()["richMenuId"]

    # ── Upload รูป (generate อัตโนมัติถ้าไม่มีไฟล์) ───────────────────
    image_path = "rich_menu.png"
    if not os.path.exists(image_path):
        image_path = _generate_rich_menu_image(image_path)

    if image_path and os.path.exists(image_path):
        with open(image_path, "rb") as f:
            img_res = httpx.post(
                f"https://api-data.line.me/v2/bot/richmenu/{rid}/content",
                headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}", "Content-Type": "image/png"},
                content=f.read(),
                timeout=30,
            )
        if img_res.status_code == 200:
            print("✅ Upload รูป Rich Menu สำเร็จ")
        else:
            print(f"⚠️ Upload รูปไม่สำเร็จ: {img_res.status_code} — menu ยังใช้งานได้แต่ไม่มีรูป")
    else:
        print("⚠️ ไม่มีรูป rich_menu.png และ generate ไม่สำเร็จ — menu จะไม่แสดงรูป")

    # ── ผูก menu กับทุก user ───────────────────────────────────────────
    httpx.delete("https://api.line.me/v2/bot/user/all/richmenu", headers=headers)
    httpx.post(f"https://api.line.me/v2/bot/user/all/richmenu/{rid}", headers=headers)
    print(f"✅ Rich Menu พร้อม (ID: {rid})")


def _generate_rich_menu_image(output_path: str) -> str | None:
    """Generate rich menu PNG ด้วย Pillow — ไม่ต้องมีไฟล์รูปภาพ"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("⚠️ ไม่มี Pillow — รัน: pip install Pillow")
        return None

    W, H = 2500, 843
    img  = Image.new("RGB", (W, H), "#1565C0")
    draw = ImageDraw.Draw(img)

    # เส้นแบ่งกลาง
    draw.rectangle([W // 2 - 2, 0, W // 2 + 2, H], fill="#0D47A1")

    _draw_panel(draw, x=0,    w=W//2, label="🛍️  สั่งสินค้า",   sub="เลือกเมนู · ระบุที่อยู่ · ติดตาม", bg="#1E88E5")
    _draw_panel(draw, x=W//2, w=W//2, label="🏪  หน้าร้านค้า", sub="ดูออเดอร์ · อัปเดตสถานะ",          bg="#3949AB")

    img.save(output_path, "PNG")
    print(f"✅ Generate {output_path} สำเร็จ")
    return output_path


def _draw_panel(draw, x: int, w: int, label: str, sub: str, bg: str):
    """วาด panel ซ้าย/ขวาของ rich menu"""
    from PIL import ImageFont

    cx = x + w // 2

    # พื้นหลัง
    draw.rectangle([x, 0, x + w, 843], fill=bg)

    # วงกลม decoration
    draw.ellipse([cx - 300, 843//2 - 360, cx + 300, 843//2 + 240], fill="#ffffff15")

    # โหลด font — fallback gracefully
    def load_font(size, bold=False):
        paths = [
            f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
            f"/usr/share/fonts/truetype/liberation/LiberationSans{'-Bold' if bold else ''}.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
        for p in paths:
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
        return ImageFont.load_default()

    font_big = load_font(130, bold=True)
    font_sub = load_font(65)

    # ข้อความหลัก
    draw.text((cx, 843//2 - 60), label, font=font_big, anchor="mm", fill="#ffffff")

    # ข้อความรอง
    draw.text((cx, 843//2 + 110), sub, font=font_sub, anchor="mm", fill="#ffffffbb")

    # ปุ่ม
    bw, bh = 480, 85
    bx, by = cx - bw//2, 843 - 145
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=42, fill="#ffffff25")
    draw.text((cx, by + bh//2), "แตะเพื่อเปิด", font=font_sub, anchor="mm", fill="#ffffff")


# ── Models ──────────────────────────────────────────────────────────
class Order(BaseModel):
    order_id:       Optional[str] = None
    user_id:        str
    items:          list[str]
    lat:            float
    lng:            float
    address:        str
    note:           Optional[str]   = ""
    total_price:    Optional[float] = 0
    payment_method: Optional[str]   = "cash"


class StatusUpdate(BaseModel):
    status:  str
    user_id: Optional[str] = None


# ── Startup ──────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    ensure_rich_menu()


# ── Routes ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "LINE Delivery API v2", "liff_id": LIFF_ID or "not set", "supabase": bool(SUPABASE_URL)}


@app.get("/health")
def health():
    return {
        "ok": True,
        "line_token": bool(LINE_CHANNEL_ACCESS_TOKEN),
        "line_secret": bool(LINE_CHANNEL_SECRET),
        "liff": bool(LIFF_ID),
        "supabase": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
    }


@app.post("/webhook")
async def webhook(request: Request):
    body      = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    if LINE_CHANNEL_SECRET:
        if not signature or not verify_line_signature(body, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    for event in data.get("events", []):
        event_type  = event.get("type")
        reply_token = event.get("replyToken")
        user_id     = event.get("source", {}).get("userId", "")

        if event_type == "follow":
            await reply_message(reply_token, [
                {
                    "type": "text",
                    "text": "ยินดีต้อนรับครับ! 🎉\nกดปุ่มด้านล่างเพื่อสั่งสินค้าได้เลย\n\n⭐ สะสมแต้มทุกคำสั่งซื้อ\n🎁 ฟรีค่าส่งเมื่อสั่ง 150฿+",
                },
                make_order_button_flex("สั่งสินค้าเลย 🛵"),
            ])

        elif event_type == "message":
            if event.get("message", {}).get("type") != "text":
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "สวัสดีครับ! กดเลือกได้เลย 👇",
                    "quickReply": {"items": _quick_reply_items()}
                }])
                continue

            text = event.get("message", {}).get("text", "").strip().lower()

            if any(w in text for w in ["สั่งสินค้า", "สั่งอาหาร", "order", "สั่ง", "เมนู", "menu"]):
                await reply_message(reply_token, [make_order_button_flex()])

            elif any(w in text for w in ["ร้านค้า", "merchant", "dashboard", "จัดการ", "admin"]):
                await reply_message(reply_token, [{
                    "type": "flex",
                    "altText": "เปิดหน้าร้านค้า",
                    "contents": {
                        "type": "bubble",
                        "body": {"type": "box", "layout": "vertical", "contents": [
                            {"type": "text", "text": "📋 จัดการออเดอร์", "weight": "bold", "size": "xl"},
                            {"type": "text", "text": "ดู/อัปเดตออเดอร์ · จัดการเมนู · สถิติ", "size": "sm", "color": "#888888", "margin": "sm"},
                        ]},
                        "footer": {"type": "box", "layout": "vertical", "contents": [{
                            "type": "button", "style": "primary", "color": "#5C6BC0",
                            "action": {"type": "uri", "label": "เปิดหน้าร้านค้า", "uri": liff_url("merchant")}
                        }]}
                    }
                }])

            elif any(w in text for w in ["สถานะ", "status", "ออเดอร์ฉัน", "เช็คออเดอร์"]):
                # ดึงออเดอร์ล่าสุดจาก Supabase
                rows = await sb_get("orders", {"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"})
                if rows:
                    order = rows[0]
                    short_id = str(order["id"])[-6:].upper()
                    await reply_message(reply_token, [
                        make_status_update_flex(order["id"], order["status"], ", ".join(order.get("items", [])))
                    ])
                else:
                    await reply_message(reply_token, [
                        {"type": "text", "text": "ยังไม่มีออเดอร์ครับ สั่งได้เลย 😊"},
                        make_order_button_flex(),
                    ])

            elif any(w in text for w in ["ช่วยเหลือ", "help", "วิธีใช้"]):
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "🛵 Delivery — คำสั่งที่ใช้ได้\n\n• สั่งสินค้า — เปิดเมนู\n• สถานะ — เช็คออเดอร์\n• ร้านค้า — หน้าจัดการ\n• ช่วยเหลือ — เมนูนี้",
                    "quickReply": {"items": _quick_reply_items()}
                }])

            else:
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "สวัสดีครับ! 😊",
                    "quickReply": {"items": _quick_reply_items()}
                }])

    return {"status": "ok"}


@app.post("/orders")
async def create_order(order: Order):
    """รับ notify จาก frontend หลัง insert Supabase แล้ว — ส่ง LINE push เท่านั้น"""
    short_id = str(order.order_id or "")[-6:].upper() if order.order_id else "NEW"

    await push_message(order.user_id, [
        make_order_confirmed_flex({
            "order_id":      short_id,
            "items":         order.items,
            "total_price":   order.total_price,
            "payment_method": order.payment_method,
            "address":       order.address,
        })
    ])
    return {"status": "notified", "order_id": order.order_id}


@app.patch("/orders/{order_id}/status")
async def update_status(order_id: str, body: StatusUpdate):
    """อัปเดต status ใน Supabase + ส่ง LINE push"""
    # Update Supabase (ถ้ามี service key)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        await sb_patch("orders", {"id": order_id}, {"status": body.status})

    # ดึง user_id + items จาก Supabase ถ้าไม่ได้ส่งมา
    user_id     = body.user_id
    items_text  = ""

    if not user_id and SUPABASE_URL:
        rows = await sb_get("orders", {"id": f"eq.{order_id}"})
        if rows:
            user_id    = rows[0].get("user_id")
            items_list = rows[0].get("items", [])
            items_text = ", ".join(items_list) if isinstance(items_list, list) else ""

    if user_id:
        await push_message(user_id, [
            make_status_update_flex(order_id, body.status, items_text)
        ])

    return {"order_id": order_id, "status": body.status}


@app.get("/orders")
async def list_orders():
    """ดูออเดอร์ทั้งหมดจาก Supabase"""
    rows = await sb_get("orders", {"order": "created_at.desc", "limit": "200"})
    return rows if rows else []


@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    rows = await sb_get("orders", {"id": f"eq.{order_id}"})
    if not rows:
        raise HTTPException(status_code=404, detail="Order not found")
    return rows[0]

# ── เพิ่มต่อจาก main.py เดิม (ส่วน Routes) ──────────────────────────
# วางต่อจาก GET /orders/{order_id}

from pydantic import BaseModel
from typing import Optional


class RoleUpdate(BaseModel):
    role: str   # 'customer' | 'merchant' | 'rider' | 'admin'


class ActiveUpdate(BaseModel):
    is_active: bool


# helper เพิ่ม: sb_post สำหรับอนาคต
async def sb_post(table: str, data: dict):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient() as c:
        res = await c.post(url, headers=sb_headers(), json=data)
        return res.json()


# ── User endpoints (admin only) ──────────────────────────────────────

@app.get("/users")
async def list_users(role: Optional[str] = None, limit: int = 200):
    """ดู user ทั้งหมด — admin ควร validate token ก่อนเรียก"""
    params = {"order": "created_at.desc", "limit": str(limit)}
    if role:
        params["role"] = f"eq.{role}"
    rows = await sb_get("users", params)
    return rows if rows else []


@app.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, body: RoleUpdate):
    """เปลี่ยน role user"""
    valid_roles = {"customer", "merchant", "rider", "admin"}
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    result = await sb_patch("users", {"line_user_id": user_id}, {"role": body.role})
    return {"user_id": user_id, "role": body.role, "updated": True}


@app.patch("/users/{user_id}/active")
async def update_user_active(user_id: str, body: ActiveUpdate):
    """ปิด/เปิดบัญชี user"""
    await sb_patch("users", {"line_user_id": user_id}, {"is_active": body.is_active})
    return {"user_id": user_id, "is_active": body.is_active, "updated": True}


# ── Cancel order endpoint ─────────────────────────────────────────────

class CancelOrder(BaseModel):
    cancelled_by:  str            # 'customer' | 'merchant' | 'rider'
    cancel_reason: Optional[str] = ""
    user_id:       Optional[str] = None  # ถ้าไม่ส่ง จะดึงจาก Supabase


CANCELLABLE_STATUSES = {"รอร้านยืนยัน", "กำลังทำ"}


@app.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, body: CancelOrder):
    """ยกเลิกออเดอร์ + push LINE แจ้งลูกค้า"""
    rows = await sb_get("orders", {"id": f"eq.{order_id}"})
    if not rows:
        raise HTTPException(status_code=404, detail="Order not found")

    order = rows[0]
    if order["status"] not in CANCELLABLE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status: {order['status']}")

    await sb_patch("orders", {"id": order_id}, {
        "status":        "ยกเลิก",
        "cancelled_by":  body.cancelled_by,
        "cancel_reason": body.cancel_reason or "",
        "updated_at":    "now()",
    })

    # Push LINE แจ้งลูกค้า
    customer_id = body.user_id or order.get("user_id")
    if customer_id:
        flex = make_cancel_flex(order_id, body.cancel_reason or "", body.cancelled_by)
        await push_message(customer_id, [flex])

    return {"order_id": order_id, "status": "ยกเลิก", "cancelled_by": body.cancelled_by}


def make_cancel_flex(order_id: str, reason: str, cancelled_by: str) -> dict:
    """Flex Message แจ้งยกเลิกออเดอร์"""
    short_id = str(order_id)[-6:].upper()
    by_map   = {"customer": "ลูกค้า", "merchant": "ร้านค้า", "rider": "ไรเดอร์"}
    by_label = by_map.get(cancelled_by, cancelled_by)

    return {
        "type": "flex",
        "altText": f"❌ ออเดอร์ #{short_id} ถูกยกเลิก",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box", "layout": "vertical",
                "backgroundColor": "#F44336", "paddingAll": "14px",
                "contents": [
                    {"type": "text", "text": "❌ ออเดอร์ถูกยกเลิก", "color": "#ffffff", "weight": "bold", "size": "lg"},
                    {"type": "text", "text": f"เลขออเดอร์ #{short_id}", "color": "#ffcdd2", "size": "xs", "margin": "xs"},
                ]
            },
            "body": {
                "type": "box", "layout": "vertical", "paddingAll": "14px",
                "contents": [
                    {
                        "type": "box", "layout": "horizontal",
                        "contents": [
                            {"type": "text", "text": "ยกเลิกโดย", "size": "sm", "color": "#888888", "flex": 3},
                            {"type": "text", "text": by_label, "size": "sm", "flex": 4, "align": "end"},
                        ]
                    },
                    *(
                        [{
                            "type": "box", "layout": "horizontal", "margin": "sm",
                            "contents": [
                                {"type": "text", "text": "เหตุผล", "size": "sm", "color": "#888888", "flex": 3},
                                {"type": "text", "text": reason, "size": "sm", "flex": 4, "wrap": True, "align": "end"},
                            ]
                        }] if reason else []
                    ),
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "paddingAll": "10px",
                "contents": [{
                    "type": "button", "style": "primary", "color": "#1E88E5",
                    "action": {"type": "uri", "label": "🛒 สั่งใหม่", "uri": liff_url("order")}
                }]
            }
        }
    }