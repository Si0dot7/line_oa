"""
รัน script นี้ครั้งเดียวเพื่อสร้าง Rich Menu ใน LINE OA
แล้วลูกค้าจะเห็นปุ่มด้านล่างหน้าแชทตลอดเวลา

วิธีรัน:
  python create_rich_menu.py
"""

import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
LIFF_ID = os.environ["LIFF_ID"]

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

LIFF_URL = f"https://liff.line.me/{LIFF_ID}"
LIFF_MERCHANT_URL = f"https://liff.line.me/{LIFF_ID}?mode=merchant"


def create_rich_menu():
    """สร้าง Rich Menu layout 2 ปุ่ม"""
    payload = {
        "size": {"width": 2500, "height": 843},
        "selected": True,  # เปิดให้เห็นทันทีโดยไม่ต้องกด
        "name": "Delivery Menu",
        "chatBarText": "เมนู",  # ข้อความที่แถบด้านล่างหน้าแชท
        "areas": [
            # ปุ่มซ้าย — สั่งสินค้า
            {
                "bounds": {"x": 0, "y": 0, "width": 1250, "height": 843},
                "action": {
                    "type": "uri",
                    "label": "สั่งสินค้า",
                    "uri": LIFF_URL,
                }
            },
            # ปุ่มขวา — หน้าร้านค้า
            {
                "bounds": {"x": 1250, "y": 0, "width": 1250, "height": 843},
                "action": {
                    "type": "uri",
                    "label": "หน้าร้านค้า",
                    "uri": LIFF_MERCHANT_URL,
                }
            },
        ]
    }

    res = httpx.post(
        "https://api.line.me/v2/bot/richmenu",
        headers=HEADERS,
        json=payload,
    )
    data = res.json()
    print(f"สร้าง Rich Menu: {res.status_code} → {data}")
    return data.get("richMenuId")


def upload_rich_menu_image(rich_menu_id: str):
    """
    อัปโหลดรูป Rich Menu (2500x843 px)
    ถ้ายังไม่มีรูป จะข้ามขั้นตอนนี้ไปก่อน
    LINE จะแสดง Rich Menu โดยไม่มีรูปได้ (เห็นแค่ขอบ)
    """
    image_path = "rich_menu.png"
    if not os.path.exists(image_path):
        print(f"⚠️  ไม่พบไฟล์ {image_path} — ข้ามการอัปโหลดรูป")
        print("   Rich Menu จะยังทำงานได้แต่ไม่มีรูปพื้นหลัง")
        print("   สร้างรูปขนาด 2500x843 px แล้วบันทึกเป็น rich_menu.png ในโฟลเดอร์นี้")
        return

    with open(image_path, "rb") as f:
        image_data = f.read()

    res = httpx.post(
        f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "image/png",
        },
        content=image_data,
    )
    print(f"อัปโหลดรูป: {res.status_code}")


def set_default_rich_menu(rich_menu_id: str):
    """ตั้งเป็น Default Rich Menu ให้ผู้ใช้ทุกคนเห็น"""
    res = httpx.post(
        f"https://api.line.me/v2/bot/user/all/richmenu/{rich_menu_id}",
        headers=HEADERS,
    )
    print(f"ตั้ง Default Rich Menu: {res.status_code}")


def list_existing_menus():
    """ดู Rich Menu ที่มีอยู่แล้ว"""
    res = httpx.get("https://api.line.me/v2/bot/richmenu/list", headers=HEADERS)
    menus = res.json().get("richmenus", [])
    print(f"\nRich Menu ที่มีอยู่: {len(menus)} รายการ")
    for m in menus:
        print(f"  - {m['richMenuId']} ({m['name']})")
    return menus


def delete_all_menus():
    """ลบ Rich Menu เก่าทั้งหมด (ใช้ก่อน recreate)"""
    menus = list_existing_menus()
    for m in menus:
        mid = m["richMenuId"]
        res = httpx.delete(f"https://api.line.me/v2/bot/richmenu/{mid}", headers=HEADERS)
        print(f"  ลบ {mid}: {res.status_code}")


if __name__ == "__main__":
    print("=== LINE Rich Menu Setup ===\n")
    print(f"LIFF URL: {LIFF_URL}")
    print(f"Merchant URL: {LIFF_MERCHANT_URL}\n")

    # ลบเมนูเก่าก่อน (ถ้ามี)
    delete_all_menus()

    # สร้างใหม่
    rich_menu_id = create_rich_menu()
    if not rich_menu_id:
        print("❌ สร้าง Rich Menu ไม่สำเร็จ เช็ค token และ LIFF_ID")
        exit(1)

    # อัปโหลดรูป (ถ้ามี)
    upload_rich_menu_image(rich_menu_id)

    # ตั้งเป็น default
    set_default_rich_menu(rich_menu_id)

    print(f"\n✅ เสร็จแล้ว! Rich Menu ID: {rich_menu_id}")
    print("เปิดหน้าแชท LINE OA แล้วควรเห็นเมนูด้านล่างทันที")