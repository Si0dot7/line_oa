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

app = FastAPI(title="LINE Delivery Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_API = "https://api.line.me/v2/bot"
LIFF_ID = os.environ.get("LIFF_ID", "")

def ensure_rich_menu():
    """ตรวจสอบและสร้าง Rich Menu ให้มีลิงก์ LIFF ที่ถูกต้องเสมอ"""
    if not LINE_CHANNEL_ACCESS_TOKEN or not LIFF_ID:
        print("⚠️ ข้าม Rich Menu setup เพราะไม่มี LINE token หรือ LIFF_ID")
        return

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    # ดึง Rich Menu ทั้งหมด
    res = httpx.get("https://api.line.me/v2/bot/richmenu/list", headers=headers)
    menus = res.json().get("richmenus", [])

    # ตรวจสอบว่ามี Menu ที่มีลิงก์ตรงกับ LIFF ปัจจุบันหรือไม่
    current_order_url = f"https://liff.line.me/{LIFF_ID}?mode=order"
    current_merchant_url = f"https://liff.line.me/{LIFF_ID}?mode=merchant"

    menu_ok = False
    for menu in menus:
        areas = menu.get("areas", [])
        if len(areas) >= 2:
            # ตรวจสอบว่า area สั่งสินค้ากับร้านค้าตรงกับ URL ปัจจุบัน
            action1 = areas[0].get("action", {})
            action2 = areas[1].get("action", {})
            if (action1.get("uri") == current_order_url and 
                action2.get("uri") == current_merchant_url):
                menu_ok = True
                print(f"✅ Rich Menu เดิมถูกต้องแล้ว (ID: {menu['richMenuId']})")
                break


    # ถ้าไม่ถูกต้อง -> ลบทั้งหมดแล้วสร้างใหม่
    print("🔄 Rich Menu ไม่ตรง/ไม่มี -> สร้างใหม่...")
    for menu in menus:
        httpx.delete(
            f"https://api.line.me/v2/bot/richmenu/{menu['richMenuId']}",
            headers=headers
        )

    # สร้าง Rich Menu ใหม่
    payload = {
        "size": {"width": 2500, "height": 843},
        "selected": True,
        "name": "Delivery Menu",
        "chatBarText": "เมนู",
        "areas": [
            {
                "bounds": {"x": 0, "y": 0, "width": 1250, "height": 843},
                "action": {"type": "uri", "label": "สั่งสินค้า", "uri": current_order_url}
            },
            {
                "bounds": {"x": 1250, "y": 0, "width": 1250, "height": 843},
                "action": {"type": "uri", "label": "หน้าร้านค้า", "uri": current_merchant_url}
            }
        ]
    }
    res = httpx.post("https://api.line.me/v2/bot/richmenu", headers=headers, json=payload)
    if res.status_code != 200:
        print(f"❌ สร้าง Rich Menu ไม่สำเร็จ: {res.text}")
        return
    rich_menu_id = res.json()["richMenuId"]

    # อัปโหลดรูป (ถ้ามีไฟล์ rich_menu.png ในโฟลเดอร์เดียวกับ main.py)
    image_path = "rich_menu.png"
    if os.path.exists(image_path):
        with open(image_path, "rb") as f:
            httpx.post(
                f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
                headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}", "Content-Type": "image/png"},
                content=f.read()
            )
        print("🖼️ อัปโหลดรูป Rich Menu แล้ว")

    # ตั้งเป็น Default
    httpx.delete(
    "https://api.line.me/v2/bot/user/all/richmenu",
    headers=headers
)
    httpx.post(
        f"https://api.line.me/v2/bot/user/all/richmenu/{rich_menu_id}",
        headers=headers
    )
    print(f"✅ Rich Menu พร้อมใช้งาน (ID: {rich_menu_id})")
# ---- In-memory store ----
orders: dict = {}


# ---- Models ----
class Order(BaseModel):
    user_id: str
    items: list[str]
    lat: float
    lng: float
    address: str
    note: Optional[str] = ""


class StatusUpdate(BaseModel):
    status: str


# ---- Helpers ----
def verify_line_signature(body: bytes, signature: str) -> bool:
    """ตรวจสอบว่า webhook มาจาก LINE จริง"""
    # FIX: ใช้ hmac.new() ถูกต้อง และไม่ใช้ชื่อตัวแปร 'hash' ที่ทับ built-in
    mac = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    expected = base64.b64encode(mac).decode("utf-8")
    return hmac.compare_digest(expected, signature)


async def push_message(user_id: str, text: str):
    """ส่ง Push Message หา user"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print(f"[push_message] No token — would send to {user_id}: {text}")
        return 200

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "to": user_id,
        "messages": [{"type": "text", "text": text}],
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{LINE_API}/message/push", json=payload, headers=headers)
        if res.status_code != 200:
            print(f"[push_message] Error {res.status_code}: {res.text}")
        return res.status_code


async def reply_message(reply_token: str, messages: list):
    """Reply กลับไปหา user ด้วย reply token"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print(f"[reply_message] No token — would reply: {messages}")
        return 200

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"replyToken": reply_token, "messages": messages}
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{LINE_API}/message/reply", json=payload, headers=headers)
        if res.status_code != 200:
            print(f"[reply_message] Error {res.status_code}: {res.text}")
        return res.status_code


def make_order_button(label="สั่งสินค้า"):
    """Flex Message ปุ่มสั่งสินค้า → เปิด LIFF"""
    liff_url = f"https://liff.line.me/{LIFF_ID}?mode=order" if LIFF_ID else "https://example.com"
    return {
        "type": "flex",
        "altText": "กดปุ่มเพื่อสั่งสินค้า",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {"type": "text", "text": "🛵 สั่งสินค้า", "weight": "bold", "size": "xl"},
                    {"type": "text", "text": "กดปุ่มด้านล่างเพื่อเลือกเมนูและระบุที่อยู่", "size": "sm", "color": "#888888", "margin": "sm"},
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [{
                    "type": "button",
                    "style": "primary",
                    "color": "#06C755",
                    "action": {"type": "uri", "label": label, "uri": liff_url}
                }]
            }
        }
    }


def make_merchant_button():
    """ปุ่มเข้าหน้า dashboard ร้านค้า"""
    merchant_url = f"https://liff.line.me/{LIFF_ID}?mode=merchant" if LIFF_ID else "https://example.com"
    return {
        "type": "flex",
        "altText": "เปิดหน้าจัดการออเดอร์",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {"type": "text", "text": "📋 จัดการออเดอร์", "weight": "bold", "size": "xl"},
                    {"type": "text", "text": "ดูและอัปเดตสถานะออเดอร์ทั้งหมด", "size": "sm", "color": "#888888", "margin": "sm"},
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [{
                    "type": "button",
                    "style": "primary",
                    "color": "#2196f3",
                    "action": {"type": "uri", "label": "เปิดหน้าออเดอร์", "uri": merchant_url}
                }]
            }
        }
    }


def make_order_status_flex(order: dict) -> dict:
    """Flex Message แสดงสถานะออเดอร์แบบสวยงาม"""
    STATUS_COLOR = {
        "รอร้านยืนยัน": "#ff9800",
        "กำลังทำ": "#2196f3",
        "กำลังจัดส่ง": "#9c27b0",
        "ส่งสำเร็จ": "#4caf50",
    }
    STATUS_ICON = {
        "รอร้านยืนยัน": "⏳",
        "กำลังทำ": "👨‍🍳",
        "กำลังจัดส่ง": "🛵",
        "ส่งสำเร็จ": "✅",
    }
    status = order["status"]
    color = STATUS_COLOR.get(status, "#888888")
    icon = STATUS_ICON.get(status, "📦")
    items_text = ", ".join(order["items"])

    return {
        "type": "flex",
        "altText": f"อัปเดตออเดอร์ #{order['order_id']}: {status}",
        "contents": {
            "type": "bubble",
            "header": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": color,
                "contents": [{
                    "type": "text",
                    "text": f"{icon} {status}",
                    "color": "#ffffff",
                    "weight": "bold",
                    "size": "lg"
                }]
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {"type": "text", "text": f"ออเดอร์ #{order['order_id']}", "weight": "bold", "size": "md"},
                    {"type": "text", "text": items_text, "size": "sm", "color": "#555555", "margin": "sm", "wrap": True},
                    {"type": "separator", "margin": "md"},
                    {
                        "type": "box", "layout": "horizontal", "margin": "md",
                        "contents": [
                            {"type": "text", "text": "ที่อยู่", "size": "sm", "color": "#888888", "flex": 2},
                            {"type": "text", "text": order.get("address", ""), "size": "sm", "flex": 5, "wrap": True},
                        ]
                    }
                ]
            }
        }
    }


# ---- Routes ----
@app.get("/")
def root():
    return {"status": "LINE Delivery API running", "liff_id": LIFF_ID or "not set"}

@app.on_event("startup")
async def startup_event():
    ensure_rich_menu()

@app.get("/health")
def health():
    token_ok = bool(LINE_CHANNEL_ACCESS_TOKEN)
    secret_ok = bool(LINE_CHANNEL_SECRET)
    liff_ok = bool(LIFF_ID)
    return {
        "ok": True,
        "token": token_ok,
        "secret": secret_ok,
        "liff": liff_ok,
        "orders_count": len(orders)
    }


@app.post("/webhook")
async def webhook(request: Request):
    """รับ event จาก LINE"""
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    # ตรวจ signature เฉพาะตอนที่มี secret (ถ้าว่างให้ผ่าน สำหรับ dev)
    if LINE_CHANNEL_SECRET:
        if not signature:
            raise HTTPException(status_code=400, detail="Missing X-Line-Signature header")
        if not verify_line_signature(body, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        print("[webhook] WARNING: LINE_CHANNEL_SECRET not set, skipping signature check")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    events = data.get("events", [])

    for event in events:
        event_type = event.get("type")
        reply_token = event.get("replyToken")
        user_id = event.get("source", {}).get("userId", "")

        # ลูกค้า Follow OA ครั้งแรก
        if event_type == "follow":
            await reply_message(reply_token, [
                {"type": "text", "text": "ยินดีต้อนรับครับ! 🎉\nกดปุ่มด้านล่างเพื่อเริ่มสั่งสินค้าได้เลย"},
                make_order_button("สั่งสินค้าเลย"),
            ])

        # รับข้อความจากลูกค้า
        elif event_type == "message":
            msg_type = event.get("message", {}).get("type", "")

            if msg_type != "text":
                # รับรูปภาพหรืออื่นๆ
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "สวัสดีครับ! กดปุ่มด้านล่างเพื่อสั่งสินค้าได้เลย 👇",
                    "quickReply": {"items": _quick_reply_items()}
                }])
                continue

            text = event.get("message", {}).get("text", "").strip()

            if text in ["สั่งสินค้า", "สั่งอาหาร", "order", "สั่ง", "เมนู", "menu"]:
                await reply_message(reply_token, [make_order_button()])

            elif text in ["ร้านค้า", "merchant", "dashboard", "จัดการ", "admin"]:
                await reply_message(reply_token, [make_merchant_button()])

            elif text in ["สถานะ", "status", "ออเดอร์ฉัน", "เช็คออเดอร์"]:
                user_orders = [o for o in orders.values() if o["user_id"] == user_id]
                if user_orders:
                    last = user_orders[-1]
                    await reply_message(reply_token, [make_order_status_flex(last)])
                else:
                    await reply_message(reply_token, [
                        {"type": "text", "text": "ยังไม่มีออเดอร์ครับ กดสั่งสินค้าได้เลย 😊"},
                        make_order_button(),
                    ])

            elif text in ["ช่วยเหลือ", "help", "?", "วิธีใช้"]:
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "คำสั่งที่ใช้ได้ครับ 👇",
                    "quickReply": {"items": _quick_reply_items()}
                }])

            else:
                await reply_message(reply_token, [{
                    "type": "text",
                    "text": "สวัสดีครับ! 😊 กดปุ่มด้านล่างเพื่อสั่งสินค้าได้เลย",
                    "quickReply": {"items": _quick_reply_items()}
                }])

    return {"status": "ok"}


def _quick_reply_items():
    return [
        {"type": "action", "action": {"type": "message", "label": "🛵 สั่งสินค้า", "text": "สั่งสินค้า"}},
        {"type": "action", "action": {"type": "message", "label": "📦 เช็คสถานะ", "text": "สถานะ"}},
        {"type": "action", "action": {"type": "message", "label": "🏪 หน้าร้านค้า", "text": "ร้านค้า"}},
        {"type": "action", "action": {"type": "message", "label": "❓ ช่วยเหลือ", "text": "ช่วยเหลือ"}},
    ]


@app.post("/orders")
async def create_order(order: Order):
    """รับออเดอร์จาก LIFF app"""
    order_id = f"ORD-{len(orders)+1:04d}"
    orders[order_id] = {
        **order.model_dump(),
        "order_id": order_id,
        "status": "รอร้านยืนยัน",
    }

    # แจ้งลูกค้าทันทีด้วย Flex Message
    await push_message(order.user_id, (
        f"✅ รับออเดอร์แล้วครับ!\n"
        f"เลขออเดอร์: #{order_id}\n"
        f"สินค้า: {', '.join(order.items)}\n"
        f"ที่อยู่: {order.address}\n"
        f"สถานะ: รอร้านยืนยัน ⏳\n\n"
        f"ร้านค้าจะแจ้งเตือนเมื่อสถานะเปลี่ยนครับ"
    ))

    return {"order_id": order_id, "status": "created"}


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    if order_id not in orders:
        raise HTTPException(status_code=404, detail="Order not found")
    return orders[order_id]


@app.patch("/orders/{order_id}/status")
async def update_status(order_id: str, body: StatusUpdate):
    """ร้านค้าอัปเดตสถานะออเดอร์"""
    if order_id not in orders:
        raise HTTPException(status_code=404, detail="Order not found")

    orders[order_id]["status"] = body.status
    user_id = orders[order_id]["user_id"]

    # ส่ง Flex Message แจ้งลูกค้า
    await push_message(user_id, (
        f"📢 อัปเดตออเดอร์ #{order_id}\n"
        f"สถานะใหม่: {body.status}"
    ))

    return {"order_id": order_id, "status": body.status}


@app.get("/orders")
def list_orders():
    """ดูออเดอร์ทั้งหมด (สำหรับร้านค้า)"""
    return list(orders.values())