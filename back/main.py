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

app = FastAPI(title="LINE Delivery Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # จำกัดให้เฉพาะ domain จริงตอน production
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_API = "https://api.line.me/v2/bot"
# print(f"Token is: {LINE_CHANNEL_ACCESS_TOKEN}")

# ---- In-memory store (ใช้ตอน dev เท่านั้น แทน DB) ----
orders: dict = {}

# ---- Models ----
class Order(BaseModel):
    user_id: str
    items: list[str]
    lat: float
    lng: float
    address: str
    note: Optional[str] = ""

# ---- Helpers ----
def verify_line_signature(body: bytes, signature: str) -> bool:
    """ตรวจสอบว่า webhook มาจาก LINE จริง"""
    hash = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    expected = base64.b64encode(hash).decode("utf-8")
    return hmac.compare_digest(expected, signature)

async def push_message(user_id: str, text: str):
    """ส่ง Push Message หา user"""
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
        return res.status_code

# ---- Routes ----
@app.get("/")
def root():
    return {"status": "LINE Delivery API running"}

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/webhook")
async def webhook(request: Request):
    """รับ event จาก LINE (message, follow, etc.)"""
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    if LINE_CHANNEL_SECRET and not verify_line_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = json.loads(body)
    events = data.get("events", [])

    for event in events:
        if event.get("type") == "follow":
            user_id = event["source"]["userId"]
            await push_message(
                user_id,
                "ยินดีต้อนรับ! กดเมนูด้านล่างเพื่อสั่งสินค้าครับ"
            )

        elif event.get("type") == "message":
            user_id = event["source"]["userId"]
            text = event.get("message", {}).get("text", "")
            if text == "สถานะ":
                user_orders = [o for o in orders.values() if o["user_id"] == user_id]
                if user_orders:
                    last = user_orders[-1]
                    await push_message(user_id, f"ออเดอร์ล่าสุด: {last['status']}")
                else:
                    await push_message(user_id, "ยังไม่มีออเดอร์ครับ")

    return {"status": "ok"}

@app.post("/orders")
async def create_order(order: Order):
    """รับออเดอร์จาก LIFF app"""
    order_id = f"ORD-{len(orders)+1:04d}"
    orders[order_id] = {
        **order.model_dump(),
        "order_id": order_id,
        "status": "รอร้านยืนยัน",
    }

    # แจ้งลูกค้าทันที
    await push_message(
        order.user_id,
        f"รับออเดอร์แล้วครับ #{order_id}\nสินค้า: {', '.join(order.items)}\nที่อยู่: {order.address}\nสถานะ: รอร้านยืนยัน"
    )

    return {"order_id": order_id, "status": "created"}

@app.get("/orders/{order_id}")
def get_order(order_id: str):
    if order_id not in orders:
        raise HTTPException(status_code=404, detail="Order not found")
    return orders[order_id]

@app.patch("/orders/{order_id}/status")
async def update_status(order_id: str, request: Request):
    """ร้านค้าอัปเดตสถานะออเดอร์"""
    if order_id not in orders:
        raise HTTPException(status_code=404, detail="Order not found")

    body = await request.json()
    new_status = body.get("status", "")
    orders[order_id]["status"] = new_status

    user_id = orders[order_id]["user_id"]
    await push_message(user_id, f"อัปเดตออเดอร์ #{order_id}: {new_status}")

    return {"order_id": order_id, "status": new_status}

@app.get("/orders")
def list_orders():
    """ดูออเดอร์ทั้งหมด (สำหรับร้านค้า)"""
    return list(orders.values())