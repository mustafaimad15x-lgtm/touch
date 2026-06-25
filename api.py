"""
api.py — FastAPI server for Telegram Mini App + Android App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• يشتغل جنباً إلى جنب مع bot.py (نفس العملية أو منفصل)
• يقرأ/يكتب مباشرة على escrow.db (نفس ملف البوت)
• يدعم مصادقتين:
    1. Telegram initData (Mini App)  → Header: X-Telegram-Init-Data
    2. Firebase ID Token (Android)   → Header: Authorization: Bearer <token>
• CORS مقيّد على نطاق Mini App فقط

التشغيل:
    uvicorn api:app --host 0.0.0.0 --port 8000

متغيرات .env المطلوبة:
    BOT_TOKEN           — للتحقق من Telegram initData
    MINIAPP_ORIGIN      — نطاق الـ Mini App (مثال: https://yourdomain.com)
                          أو * في بيئة التطوير فقط
    FIREBASE_PROJECT_ID — معرّف مشروع Firebase (مثال: hamogram-ba159)
                          مطلوب لدعم تطبيق الأندرويد
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import asyncio
import re
import time
import urllib.parse
from contextlib import asynccontextmanager
from typing import Annotated, Optional

import aiohttp
import httpx
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from database import Database
from ton_monitor import TonMonitor
from config import DEAL_TIMEOUT_MINUTES, GIFT_TIMEOUT_MINUTES
from config import TON_WALLET_ADDRESS, BOT_TOKEN, FEE_PERCENT, DEAL_TIMEOUT_MINUTES, MIN_DEAL_AMOUNT_TON

# ── Logging ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("api")

# ── Constants ──────────────────────────────────────────────────
MINIAPP_ORIGIN      = os.getenv("MINIAPP_ORIGIN", "*")      # * للتطوير فقط
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hamogram-ba159")
MAX_INIT_AGE        = 86400     # ثانية — initData لا يقبل أقدم من 24 ساعة
MAX_DEAL_AMOUNT     = 10_000.0

# ── Firebase public keys cache ─────────────────────────────────
_firebase_keys_cache: dict = {}
_firebase_keys_expiry: float = 0.0

async def _get_firebase_public_keys() -> dict:
    """جلب مفاتيح Google العامة للتحقق من Firebase ID tokens (مع cache)."""
    global _firebase_keys_cache, _firebase_keys_expiry
    now = time.time()
    if _firebase_keys_cache and now < _firebase_keys_expiry:
        return _firebase_keys_cache

    url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                # استخراج وقت انتهاء صلاحية الـ Cache-Control
                cc = resp.headers.get("Cache-Control", "")
                max_age = 3600  # افتراضي ساعة واحدة
                m = re.search(r"max-age=(\d+)", cc)
                if m:
                    max_age = int(m.group(1))
                _firebase_keys_cache = await resp.json(content_type=None)
                _firebase_keys_expiry = now + max_age
    except Exception as e:
        logger.warning(f"[Firebase] Failed to fetch public keys: {e}")
        if _firebase_keys_cache:
            return _firebase_keys_cache  # استخدم الـ cache القديم إن وُجد
        raise

    return _firebase_keys_cache


async def _verify_firebase_token(token: str) -> dict:
    """
    يتحقق من Firebase ID Token ويعيد payload المستخدم.
    يستخدم مكتبة PyJWT مع مفاتيح Google العامة.
    """
    try:
        import jwt as pyjwt
        from jwt import algorithms as jwt_algs
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PyJWT not installed — run: pip install PyJWT cryptography",
        )

    # فك ترميز الـ header فقط للحصول على kid
    try:
        unverified_header = pyjwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token format")

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Missing kid in Firebase token")

    # جلب المفاتيح العامة
    try:
        keys = await _get_firebase_public_keys()
    except Exception:
        raise HTTPException(status_code=503, detail="Cannot verify Firebase token right now")

    if kid not in keys:
        raise HTTPException(status_code=401, detail="Firebase token key not found")

    cert_pem = keys[kid]
    try:
        payload = pyjwt.decode(
            token,
            cert_pem,
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            options={"verify_exp": True},
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Firebase token expired")
    except pyjwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Firebase token audience mismatch")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Firebase token invalid: {e}")

    # التحقق من issuer
    expected_iss = f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}"
    if payload.get("iss") != expected_iss:
        raise HTTPException(status_code=401, detail="Firebase token issuer mismatch")

    return payload

# ── DB instance (shared with bot if same process) ──────────────
db = Database()
monitor = TonMonitor(db=db)

_BOT_INTERNAL_PORT = int(os.getenv("BOT_INTERNAL_PORT", "8001"))
_BOT_INTERNAL_URL  = f"http://127.0.0.1:{_BOT_INTERNAL_PORT}/internal"

_TG_API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


def _extract_gift_slug(val: str) -> Optional[str]:
    """استخراج slug الهدية من الرابط أو النص المباشر."""
    if not val:
        return None
    patterns = [
        r't\.me/nft/([a-z0-9\-]+)',
        r'fragment\.com/gift/([a-z0-9\-]+)',
        r'nft\.fragment\.com/gift/([a-z0-9\-]+)',
    ]
    for pattern in patterns:
        m = re.search(pattern, val, re.IGNORECASE)
        if m:
            return m.group(1).lower()
    # Raw slug: letters, digits, hyphens ending with digits
    if re.match(r'^[a-zA-Z][a-zA-Z0-9\-]+-\d+$', val.strip()):
        return val.strip().lower()
    return None


def _extract_chat_identifier(raw: str) -> str:
    """
    يحوّل رابط/يوزرنيم قناة أو كروب إلى صيغة تقبلها Telegram API (@username).
    يدعم: https://t.me/name | t.me/name | @name | name
    أسماء القنوات/الكروبات الخاصة (روابط دعوة t.me/+xxxx أو joinchat) غير
    مدعومة عبر getChat بدون أن يكون البوت عضواً فيها مسبقاً — لذلك تُرفض هنا.
    """
    raw = raw.strip()
    m = re.search(r"t\.me/(\+|joinchat/)", raw, re.IGNORECASE)
    if m:
        raise ValueError("private_invite_link")
    m = re.search(r"t\.me/([a-zA-Z0-9_]{5,32})/?$", raw)
    if m:
        return "@" + m.group(1)
    if raw.startswith("@"):
        return raw
    if re.fullmatch(r"[a-zA-Z0-9_]{5,32}", raw):
        return "@" + raw
    raise ValueError("invalid_format")


async def fetch_chat_preview(identifier: str) -> dict:
    """
    يستدعي getChat + getChatMemberCount من Telegram Bot API (سيرفر فقط — BOT_TOKEN
    لا يُمرَّر أبداً للواجهة). يُستخدم لمعاينة القنوات/الكروبات قبل وبعد إنشاء الصفقة.
    """
    chat_id = _extract_chat_identifier(identifier)

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{_TG_API_BASE}/getChat",
            params={"chat_id": chat_id},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp:
            data = await resp.json()
            if not data.get("ok"):
                raise ValueError(data.get("description", "chat_not_found"))
            chat = data["result"]

        chat_type = chat.get("type")
        if chat_type not in ("channel", "group", "supergroup"):
            raise ValueError("not_a_channel_or_group")

        member_count = None
        async with session.get(
            f"{_TG_API_BASE}/getChatMemberCount",
            params={"chat_id": chat_id},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as resp:
            data = await resp.json()
            if data.get("ok"):
                member_count = data["result"]

        photo_url = None
        photo = chat.get("photo")
        if photo and photo.get("small_file_id"):
            # لا نبني رابط Telegram المباشر هنا (كان يحتوي BOT_TOKEN صريحاً في الرابط
            # المُرسَل للواجهة — ثغرة أمنية). نمرّر فقط file_id عبر مسار proxy داخلي
            # خاص بسيرفرنا؛ السيرفر هو من يستدعي Telegram بالتوكن وقت تحميل الصورة فعلاً.
            photo_url = f"/chat-photo/{urllib.parse.quote(photo['small_file_id'], safe='')}"

    return {
        "title":        chat.get("title", ""),
        "username":     chat.get("username", ""),
        "type":         "channel" if chat_type == "channel" else "group",
        "member_count": member_count,
        "photo_url":    photo_url,
    }


async def _notify_bot(action: str, deal_id: int, actor_id: int, extra: dict = None) -> None:
    """يُرسل طلب إلى Internal HTTP Bridge في bot.py بدلاً من فتح اتصال Telegram مباشر."""
    payload = {"deal_id": deal_id, "actor_id": actor_id}
    if extra:
        payload.update(extra)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{_BOT_INTERNAL_URL}/{action}",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                result = await resp.json()
                if not result.get("ok"):
                    logger.warning(
                        f"[API] _notify_bot action={action} deal={deal_id} "
                        f"→ bridge returned: {result}"
                    )
    except Exception as e:
        logger.error(f"[API] _notify_bot failed action={action} deal={deal_id}: {e}")


# ════════════════════════════════════════════════════════════════
#  Lifespan — init DB on startup
# ════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    logger.info("[API] ✅ Database ready")
    yield
    logger.info("[API] 🛑 Shutting down")


# ════════════════════════════════════════════════════════════════
#  App
# ════════════════════════════════════════════════════════════════
app = FastAPI(
    title="GramEscrow API",
    version="1.0.0",
    docs_url=None,       # أغلق Swagger في production
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[MINIAPP_ORIGIN] if MINIAPP_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Telegram-Init-Data", "Authorization"],
)


# ════════════════════════════════════════════════════════════════
#  Telegram initData Verification
# ════════════════════════════════════════════════════════════════
class TelegramUser(BaseModel):
    id: int
    first_name: str = ""
    last_name: str  = ""
    username: str   = ""
    language_code: str = ""


def _verify_init_data(raw: str) -> TelegramUser:
    """
    يتحقق من صحة initData الواردة من Telegram Mini App.
    الخوارزمية الرسمية:
      1. فصل hash عن باقي الحقول
      2. ترتيب الحقول أبجدياً وضمها بـ \\n
      3. HMAC-SHA256 بمفتاح = HMAC-SHA256("WebAppData", BOT_TOKEN)
      4. مقارنة الـ hash
    """
    if not raw:
        raise HTTPException(status_code=401, detail="Missing initData")

    try:
        parsed = dict(urllib.parse.parse_qsl(raw, keep_blank_values=True))
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed initData")

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing hash in initData")

    # ── تحقق من العمر ─────────────────────────────────────────
    auth_date = parsed.get("auth_date", "0")
    try:
        age = int(time.time()) - int(auth_date)
        if age > MAX_INIT_AGE:
            raise HTTPException(status_code=401, detail="initData expired")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid auth_date")

    # ── احسب الـ hash ─────────────────────────────────────────
    data_check = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )
    secret_key = hmac.new(
        b"WebAppData",
        BOT_TOKEN.encode(),
        hashlib.sha256,
    ).digest()
    expected = hmac.new(
        secret_key,
        data_check.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise HTTPException(status_code=401, detail="Invalid initData signature")

    # ── استخرج بيانات المستخدم ────────────────────────────────
    user_raw = parsed.get("user")
    if not user_raw:
        raise HTTPException(status_code=401, detail="No user in initData")

    try:
        user_dict = json.loads(user_raw)
        return TelegramUser(**user_dict)
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed user data")


async def get_current_user(request: Request) -> TelegramUser:
    """
    Dependency — يُستخدم في كل endpoint محمي.
    يدعم مصادقتين:
      1. Mini App  → Header: X-Telegram-Init-Data
      2. Android   → Header: Authorization: Bearer <firebase_token>
    """
    # ── مسار 1: Telegram Mini App ─────────────────────────────
    tg_init = request.headers.get("X-Telegram-Init-Data", "").strip()
    if tg_init:
        tg_user = _verify_init_data(tg_init)
        await db.ensure_user(tg_user.id, tg_user.username)
        return tg_user

    # ── مسار 2: Android Firebase Token ───────────────────────
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.startswith("Bearer "):
        firebase_token = auth_header[7:].strip()
        payload = await _verify_firebase_token(firebase_token)

        # uid الـ Firebase هو المعرّف الفريد للمستخدم
        firebase_uid = payload.get("sub") or payload.get("uid", "")
        if not firebase_uid:
            raise HTTPException(status_code=401, detail="Firebase token missing uid")

        # نحوّل uid إلى رقم صحيح بأخذ hash ثابت (لا نغيّر DB schema)
        # نستخدم prefix سالب ليُميَّز عن Telegram IDs الموجبة
        uid_int = -(abs(hash(firebase_uid)) % (10 ** 15))

        # بيانات المستخدم من Firebase payload
        email    = payload.get("email", "")
        name     = payload.get("name", "")
        username = (email.split("@")[0] if email else name or firebase_uid[:12]).replace(" ", "_")

        android_user = TelegramUser(
            id=uid_int,
            first_name=name.split()[0] if name else username,
            last_name=" ".join(name.split()[1:]) if name and len(name.split()) > 1 else "",
            username=username,
            language_code="ar",
        )
        await db.ensure_user(android_user.id, android_user.username)
        logger.info(f"[API] Firebase user: uid={firebase_uid} → db_id={uid_int} email={email}")
        return android_user

    # ── لا يوجد header مصادقة ─────────────────────────────────
    raise HTTPException(
        status_code=401,
        detail="Authentication required: provide X-Telegram-Init-Data or Authorization: Bearer <firebase_token>",
    )


# نوع مختصر للـ Dependency
CurrentUser = Annotated[TelegramUser, Depends(get_current_user)]


# ════════════════════════════════════════════════════════════════
#  Schemas — Request / Response
# ════════════════════════════════════════════════════════════════
class DealOut(BaseModel):
    id: int
    role: str           # "seller" | "buyer"
    status: str
    gift_desc: str
    item_type: str = "gift"
    item_meta: Optional[dict] = None
    stars_count: Optional[int] = None
    amount_ton: float
    fee_ton: float
    seller_gets: float
    other_username: Optional[str] = None
    other_id: Optional[int] = None
    mode: str = "private"
    escrow_wallet: str = ""
    image_url: Optional[str] = None
    created_at: int
    updated_at: int


class StatsOut(BaseModel):
    ton_held: float
    active: int
    completed: int
    disputed: int


class MeOut(BaseModel):
    user_id: int
    username: str
    wallet_address: Optional[str]
    language: str


class CreateDealIn(BaseModel):
    buyer_id:       Optional[int] = None
    buyer_username: Optional[str] = None   # @username بديل عن buyer_id
    mode: str       = "private"            # private | market
    gift_desc: str  = Field(..., min_length=1, max_length=200)
    item_type: str  = "gift"               # gift | id | channel | group | stars
    stars_count: Optional[int] = None      # عدد النجوم (فقط عند item_type=stars)
    amount_ton: float

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in ("private", "market"):
            raise ValueError("mode must be one of: private, market")
        return v

    @field_validator("item_type")
    @classmethod
    def validate_item_type(cls, v: str) -> str:
        if v not in ("gift", "id", "channel", "group", "stars"):
            raise ValueError("item_type must be one of: gift, id, channel, group, stars")
        return v

    @field_validator("amount_ton")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v < MIN_DEAL_AMOUNT_TON:
            raise ValueError(f"Minimum amount is {MIN_DEAL_AMOUNT_TON} TON")
        if v > MAX_DEAL_AMOUNT:
            raise ValueError(f"Maximum amount is {MAX_DEAL_AMOUNT} TON")
        return round(v, 6)


class SetLanguageIn(BaseModel):
    language: str

    @field_validator("language")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        if v not in ("ar", "en", "ru"):
            raise ValueError("language must be ar, en, or ru")
        return v


class SetWalletIn(BaseModel):
    wallet_address: str

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        v = v.strip()
        # صيغة raw من TonConnect مثل "0:abcd...1234" (64 hex بعد ":")
        if len(v) < 10:
            raise ValueError("Wallet address too short")
        return v


def _crc16(data: bytes) -> bytes:
    """CRC16/XMODEM لتشفير عنوان TON raw إلى friendly format."""
    poly = 0x1021
    crc = 0
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ poly
            else:
                crc <<= 1
            crc &= 0xFFFF
    return crc.to_bytes(2, "big")


# ════════════════════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════════════════════
async def _build_deal_out(deal: dict, user_id: int) -> DealOut:
    """يبني DealOut ويجلب اسم الطرف الآخر."""
    is_seller   = deal["seller_id"] == user_id
    other_id    = deal["buyer_id"] if is_seller else deal["seller_id"]
    other_uname = None
    if other_id is not None:
        other_user  = await db.get_user(other_id)
        other_uname = other_user["username"] if other_user else str(other_id)
    seller_gets = round(deal["amount_ton"] - deal["fee_ton"], 6)

    item_meta_raw = deal.get("item_meta")
    item_meta = None
    if item_meta_raw:
        try:
            item_meta = json.loads(item_meta_raw)
        except Exception:
            item_meta = None

    # إنشاء رابط الصورة للهدايا
    item_type = deal.get("item_type") or "gift"
    image_url = None
    if item_type == "gift":
        slug = _extract_gift_slug(deal.get("gift_desc", ""))
        if slug:
            image_url = f"/nft-image/{slug}"

    return DealOut(
        id            = deal["id"],
        role          = "seller" if is_seller else "buyer",
        status        = deal["status"],
        gift_desc     = deal["gift_desc"],
        item_type     = deal.get("item_type") or "gift",
        item_meta     = item_meta,
        amount_ton    = deal["amount_ton"],
        fee_ton       = deal["fee_ton"],
        seller_gets   = seller_gets,
        other_username= other_uname,
        other_id      = other_id,
        mode          = deal.get("mode") or "private",
        escrow_wallet = TON_WALLET_ADDRESS,
        image_url     = image_url,
        created_at    = deal["created_at"],
        updated_at    = deal["updated_at"],
    )


def _compute_stats(deals: list, user_id: int) -> StatsOut:
    """يحسب الإحصائيات من قائمة صفقات المستخدم."""
    ACTIVE_STATUSES = {"PENDING", "WAITING_PAYMENT", "PAID", "GIFT_SENT"}
    ton_held  = 0.0
    active    = 0
    completed = 0
    disputed  = 0

    for d in deals:
        if d["status"] in ACTIVE_STATUSES:
            active += 1
            # TON محتجز فقط إذا المستخدم هو المشتري ودفع
            if d["buyer_id"] == user_id and d["status"] in {"PAID", "GIFT_SENT"}:
                ton_held += d["amount_ton"]
        elif d["status"] == "COMPLETED":
            completed += 1
        elif d["status"] == "DISPUTED":
            disputed += 1

    return StatsOut(
        ton_held  = round(ton_held, 6),
        active    = active,
        completed = completed,
        disputed  = disputed,
    )


# ════════════════════════════════════════════════════════════════
#  Routes
# ════════════════════════════════════════════════════════════════

# ── Health ─────────────────────────────────────────────────────
@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "ts": int(time.time())}


# ── Me ─────────────────────────────────────────────────────────
@app.get("/me", response_model=MeOut)
async def get_me(user: CurrentUser):
    """بيانات المستخدم الحالي + المحفظة + اللغة."""
    row = await db.get_user(user.id)
    return MeOut(
        user_id        = user.id,
        username       = user.username or row.get("username", "") if row else user.username,
        wallet_address = row.get("wallet_address") if row else None,
        language       = row.get("language", "ar") if row else "ar",
    )


# ── Language ───────────────────────────────────────────────────
@app.post("/me/language", status_code=status.HTTP_204_NO_CONTENT)
async def set_language(body: SetLanguageIn, user: CurrentUser):
    """يحفظ اختيار اللغة."""
    await db.save_language(user.id, body.language)


# ── Wallet ─────────────────────────────────────────────────────
@app.post("/me/wallet", status_code=status.HTTP_204_NO_CONTENT)
async def set_wallet(body: SetWalletIn, user: CurrentUser):
    """يحفظ عنوان محفظة TON Connect للمستخدم. يرفض الاستبدال إذا كانت محفظة أخرى مرتبطة مسبقاً،
    ويرفض الربط إذا كان هذا العنوان مستخدماً بالفعل من حساب آخر."""
    existing = await db.get_user(user.id)
    current_addr = existing.get("wallet_address") if existing else None
    if current_addr and current_addr != body.wallet_address:
        raise HTTPException(
            status_code=400,
            detail="A wallet is already connected. Disconnect it first before connecting a new one.",
        )

    owner = await db.get_user_by_wallet(body.wallet_address)
    if owner and owner["user_id"] != user.id:
        raise HTTPException(
            status_code=409,
            detail="This wallet address is already linked to another account. Please connect a different wallet.",
        )

    await db.save_wallet(user.id, body.wallet_address)
    logger.info(f"[API] wallet saved for user {user.id}")


@app.get("/nft-image-data/{slug}")
async def nft_data_proxy(slug: str):
    """جلب بيانات NFT من Fragment"""
    url = f"https://nft.fragment.com/gift/{slug}.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://fragment.com/",
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=headers, timeout=8)
            if r.status_code == 200:
                from fastapi.responses import JSONResponse
                return JSONResponse(content=r.json())
    except Exception:
        pass
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404, content={})


@app.get("/nft-image/{slug}")
async def nft_image_proxy(slug: str):
    """Proxy لصورة NFT من Fragment لتجاوز قيود CORS"""
    url = f"https://nft.fragment.com/gift/{slug}.webp"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://fragment.com/",
        "Accept": "image/webp,image/*",
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=headers, timeout=8, follow_redirects=True)
            if r.status_code == 200:
                from fastapi.responses import Response
                return Response(content=r.content, media_type="image/webp")
    except Exception:
        pass
    from fastapi.responses import Response
    return Response(status_code=404)


@app.get("/chat-photo/{file_id}")
async def chat_photo_proxy(file_id: str):
    """
    Proxy لصورة قناة/كروب من Telegram.
    BOT_TOKEN يُستخدم هنا فقط على السيرفر (داخل getFile وتحميل الصورة) ولا يُرسَل
    أبداً للواجهة — على عكس الكود القديم الذي كان يضع التوكن صريحاً داخل رابط
    الصورة المُرسَل للمتصفح. file_id فقط هو المار عبر الشبكة للعميل، وهو غير حسّاس.
    """
    from fastapi.responses import Response
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{_TG_API_BASE}/getFile",
                params={"file_id": file_id},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                fdata = await resp.json()
                if not fdata.get("ok"):
                    return Response(status_code=404)
                file_path = fdata["result"]["file_path"]

            async with session.get(
                f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}",
                timeout=aiohttp.ClientTimeout(total=8),
            ) as img_resp:
                if img_resp.status != 200:
                    return Response(status_code=404)
                content = await img_resp.read()
                return Response(
                    content=content,
                    media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=3600"},
                )
    except Exception:
        return Response(status_code=404)


@app.delete("/me/wallet", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_wallet(user: CurrentUser):
    """
    يفصل المحفظة المرتبطة بالمستخدم.
    يُرفض إذا كان للمستخدم صفقات نشطة (WAITING_PAYMENT, PAID, GIFT_SENT).
    """
    existing = await db.get_user(user.id)
    if not existing or not existing.get("wallet_address"):
        raise HTTPException(status_code=400, detail="No wallet connected.")

    # منع الفصل أثناء وجود صفقات نشطة
    deals = await db.get_user_deals(user.id)
    active_statuses = {"WAITING_PAYMENT", "PAID", "GIFT_SENT"}
    active_as_seller = [
        d for d in deals
        if d["seller_id"] == user.id and d["status"] in active_statuses
    ]
    if active_as_seller:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot disconnect wallet — you have {len(active_as_seller)} active deal(s). Complete or cancel them first.",
        )

    await db.remove_wallet(user.id)
    logger.info(f"[API] wallet disconnected for user {user.id}")


# ── Market listings ────────────────────────────────────────────
@app.get("/market")
async def get_market(user: CurrentUser, type: str = None):
    """
    يعيد الصفقات المنشورة في السوق العام.
    ?type=gift|channel|id|stars|mine
    """
    if type == 'mine':
        raw = await db.get_market_listings(user_id=user.id)
    elif type in ('gift', 'channel', 'id', 'stars', 'group'):
        raw = await db.get_market_listings(item_type=type)
    else:
        raw = await db.get_market_listings()

    result = []
    for d in raw:
        try:
            out = await _build_deal_out(d, user.id)
            result.append(out.model_dump())
        except Exception:
            pass
    return result


# ── Deals list + stats ─────────────────────────────────────────
@app.get("/deals")
async def list_deals(user: CurrentUser):
    """
    يعيد صفقات المستخدم (آخر 20) + إحصائيات سريعة.
    Response:
        { stats: StatsOut, deals: DealOut[] }
    """
    raw_deals = await db.get_user_deals(user.id)
    deals_out = [await _build_deal_out(d, user.id) for d in raw_deals]
    stats     = _compute_stats(raw_deals, user.id)

    return {
        "stats": stats.model_dump(),
        "deals": [d.model_dump() for d in deals_out],
    }


# ── Single deal ────────────────────────────────────────────────
@app.get("/deals/{deal_id}", response_model=DealOut)
async def get_deal(deal_id: int, user: CurrentUser):
    """تفاصيل صفقة واحدة — يشترط أن يكون المستخدم طرفاً فيها."""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["seller_id"] != user.id and deal["buyer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await _build_deal_out(deal, user.id)


# ── Chat preview (channel/group) ─────────────────────────────────
@app.get("/chat-preview")
async def chat_preview(identifier: str, user: CurrentUser):
    """
    معاينة حيّة لقناة/كروب وهو البائع يكتب الرابط في صفحة إنشاء الصفقة.
    الاستدعاء لـ Telegram API يتم من السيرفر فقط — BOT_TOKEN لا يصل للواجهة.
    """
    try:
        info = await fetch_chat_preview(identifier)
    except ValueError as e:
        code = str(e)
        messages = {
            "private_invite_link": "Private invite links aren't supported — share a public @username instead",
            "invalid_format":      "Enter a valid @username or t.me/ link",
            "not_a_channel_or_group": "This is not a channel or group",
        }
        raise HTTPException(status_code=400, detail=messages.get(code, "Chat not found — make sure it's public"))
    return info


# ── Create deal ────────────────────────────────────────────────
@app.post("/deals", status_code=status.HTTP_201_CREATED)
async def create_deal(body: CreateDealIn, user: CurrentUser):
    """
    البائع يُنشئ صفقة جديدة.
    يشترط: المستخدم سجّل محفظة مسبقاً.
    """
    # تحديد المشتري — مطلوب فقط للصفقات الخاصة. صفقات السوق العام
    # تُنشأ بلا مشترٍ محدد؛ أي شخص يمكنه طلبها لاحقاً عبر /deals/{id}/claim
    buyer_id = None
    if body.mode == "private":
        if body.buyer_username:
            uname = body.buyer_username.lstrip("@").strip()
            buyer = await db.get_user_by_username(uname)
            if not buyer:
                raise HTTPException(status_code=404, detail=f"User @{uname} not found — they must have used the bot at least once")
            buyer_id = buyer["user_id"]
        elif body.buyer_id:
            buyer = await db.get_user(body.buyer_id)
            if not buyer:
                raise HTTPException(status_code=404, detail="Buyer not found")
            buyer_id = body.buyer_id
        else:
            raise HTTPException(status_code=400, detail="Provide buyer_id or buyer_username")

        if buyer_id == user.id:
            raise HTTPException(status_code=400, detail="Cannot create deal with yourself")

    # تحقق من محفظة البائع
    seller = await db.get_user(user.id)
    if not seller or not seller.get("wallet_address"):
        raise HTTPException(
            status_code=400,
            detail="Register your TON wallet first before creating a deal",
        )

    # للقناة/الكروب: يُعاد التحقق من السيرفر عند الإنشاء (لا نثق بمعاينة الواجهة)
    # ويُخزَّن item_meta الموثّق ليبقى ظاهراً للمشتري في تفاصيل الصفقة لاحقاً.
    item_meta_json = None
    if body.item_type in ("channel", "group"):
        try:
            info = await fetch_chat_preview(body.gift_desc)
        except ValueError as e:
            code = str(e)
            messages = {
                "private_invite_link": "Private invite links aren't supported — share a public @username instead",
                "invalid_format":      "Enter a valid @username or t.me/ link",
                "not_a_channel_or_group": "This is not a channel or group",
            }
            raise HTTPException(status_code=400, detail=messages.get(code, "Chat not found — make sure it's public and try again"))
        item_meta_json = json.dumps(info, ensure_ascii=False)

    # للنجوم: التحقق من عدد النجوم
    if body.item_type == "stars":
        if not body.stars_count or body.stars_count < 1:
            raise HTTPException(status_code=400, detail="stars_count must be a positive integer")
        if body.stars_count > 10_000_000:
            raise HTTPException(status_code=400, detail="stars_count exceeds maximum allowed (10,000,000)")

    fee     = round(body.amount_ton * FEE_PERCENT / 100, 6)
    deal_id = await db.create_deal(
        seller_id   = user.id,
        buyer_id    = buyer_id,
        gift_desc   = body.gift_desc,
        amount_ton  = body.amount_ton,
        fee_ton     = fee,
        item_type   = body.item_type,
        item_meta   = item_meta_json,
        stars_count = body.stars_count if body.item_type == "stars" else None,
        mode        = body.mode,
    )
    logger.info(f"[API] deal #{deal_id} created by user {user.id} (mode={body.mode})")
    if body.mode == "private":
        asyncio.create_task(_notify_bot("deal-created", deal_id, user.id))

    deal = await db.get_deal(deal_id)
    return {
        "deal_id"    : deal_id,
        "fee_ton"    : fee,
        "seller_gets": round(body.amount_ton - fee, 6),
        "status"     : deal["status"],
        "timeout_min": DEAL_TIMEOUT_MINUTES,
    }


# ── Claim a market listing (buyer) ────────────────────────────
@app.post("/deals/{deal_id}/claim", status_code=status.HTTP_204_NO_CONTENT)
async def claim_deal(deal_id: int, user: CurrentUser):
    """
    مشتري يطلب عنصراً منشوراً في السوق العام. الانتقال: PENDING → WAITING_PAYMENT.
    عملية ذرّية على مستوى قاعدة البيانات لمنع طلبين متزامنين لنفس العنصر.
    """
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal.get("mode") != "market":
        raise HTTPException(status_code=400, detail="This deal is not a market listing")
    if deal["seller_id"] == user.id:
        raise HTTPException(status_code=400, detail="Cannot buy your own listing")
    if deal["buyer_id"] is not None or deal["status"] != "PENDING":
        raise HTTPException(status_code=409, detail="This listing is no longer available")

    claimed = await db.claim_market_deal(deal_id, user.id)
    if not claimed:
        raise HTTPException(status_code=409, detail="This listing was just claimed by someone else")

    logger.info(f"[API] market deal #{deal_id} claimed by buyer {user.id}")
    asyncio.create_task(_api_monitor_payment(deal_id))


# ── Accept deal (buyer) ─────────────────────────────────────────
@app.post("/deals/{deal_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_deal(deal_id: int, user: CurrentUser):
    """المشتري يوافق على عرض الصفقة. الانتقال: PENDING → WAITING_PAYMENT"""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["buyer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can accept this deal")
    if deal["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept from status '{deal['status']}'",
        )

    changed = await db.transition_deal_status(
        deal_id,
        from_status="PENDING",
        to_status="WAITING_PAYMENT",
        actor_id=user.id,
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed — try again")

    logger.info(f"[API] deal #{deal_id} accepted by buyer {user.id}")
    # ابدأ مراقبة البلوكشين لاكتشاف الدفع تلقائياً
    asyncio.create_task(_api_monitor_payment(deal_id))


# ── Reject deal (buyer) ──────────────────────────────────────────
@app.post("/deals/{deal_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_deal(deal_id: int, user: CurrentUser):
    """المشتري يرفض عرض الصفقة. الانتقال: PENDING → REJECTED"""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["buyer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can reject this deal")
    if deal["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject from status '{deal['status']}'",
        )

    changed = await db.transition_deal_status(
        deal_id,
        from_status="PENDING",
        to_status="REJECTED",
        actor_id=user.id,
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed — try again")

    logger.info(f"[API] deal #{deal_id} rejected by buyer {user.id}")


# ── Confirm receipt (buyer) ────────────────────────────────────
@app.post("/deals/{deal_id}/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_deal(deal_id: int, user: CurrentUser):
    """
    المشتري يؤكد استلام الهدية.
    الانتقال: GIFT_SENT → COMPLETED
    ملاحظة: الدفع الفعلي للبائع يتم من البوت — الـ API يغير الحالة فقط،
            والبوت يراقب التغيير (أو يُستدعى عبر webhook داخلي).
    """
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["buyer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm")
    if deal["status"] != "GIFT_SENT":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm from status '{deal['status']}'",
        )

    changed = await db.transition_deal_status(
        deal_id,
        from_status="GIFT_SENT",
        to_status="COMPLETED",
        actor_id=user.id,
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed — try again")

    logger.info(f"[API] deal #{deal_id} confirmed by buyer {user.id}")

    # ── أخطر البوت ليُرسل TON للبائع ويُرسل إشعارات ──────────
    asyncio.create_task(_notify_bot("confirm", deal_id, user.id))


# ── Open dispute (buyer) ───────────────────────────────────────
@app.post("/deals/{deal_id}/dispute", status_code=status.HTTP_204_NO_CONTENT)
async def dispute_deal(deal_id: int, user: CurrentUser):
    """المشتري يفتح نزاعاً. الانتقال: GIFT_SENT → DISPUTED"""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["buyer_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can open a dispute")
    if deal["status"] != "GIFT_SENT":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dispute from status '{deal['status']}'",
        )

    changed = await db.transition_deal_status(
        deal_id,
        from_status="GIFT_SENT",
        to_status="DISPUTED",
        actor_id=user.id,
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed")

    logger.info(f"[API] dispute opened on deal #{deal_id} by {user.id}")

    # ── أخطر البوت ليُرسل إشعارات البائع والأدمن ──────────────
    asyncio.create_task(_notify_bot("dispute", deal_id, user.id))


# ── Mark gift sent (seller) ────────────────────────────────────
@app.post("/deals/{deal_id}/gift-sent", status_code=status.HTTP_204_NO_CONTENT)
async def mark_gift_sent(deal_id: int, user: CurrentUser):
    """البائع يضغط 'أرسلت الهدية'. الانتقال: PAID → GIFT_SENT"""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["seller_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can mark gift as sent")
    if deal["status"] != "PAID":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark gift sent from status '{deal['status']}'",
        )

    changed = await db.transition_deal_status(
        deal_id,
        from_status="PAID",
        to_status="GIFT_SENT",
        actor_id=user.id,
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed")

    logger.info(f"[API] gift marked sent on deal #{deal_id} by seller {user.id}")
    asyncio.create_task(_notify_bot("gift-sent", deal_id, user.id))

    # ── أخطر البوت ليُرسل رسالة للمشتري مع أزرار Confirm/Dispute ──



# ── Cancel deal (seller — PENDING only) ───────────────────────
@app.post("/deals/{deal_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_deal(deal_id: int, user: CurrentUser):
    """البائع يلغي صفقة لم يقبلها المشتري بعد. الانتقال: PENDING → REJECTED"""
    deal = await db.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    if deal["seller_id"] != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can cancel this deal")
    if deal["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Can only cancel a PENDING deal (current: {deal['status']})",
        )
    changed = await db.transition_deal_status(
        deal_id, from_status="PENDING", to_status="REJECTED", actor_id=user.id
    )
    if not changed:
        raise HTTPException(status_code=409, detail="Status already changed — try again")
    logger.info(f"[API] deal #{deal_id} cancelled by seller {user.id}")
    asyncio.create_task(_notify_bot("deal-cancelled", deal_id, user.id))


# ── Report user ────────────────────────────────────────────────
class ReportIn(BaseModel):
    target_id: int
    reason:    str = Field(..., min_length=5, max_length=500)
    deal_id:   Optional[int] = None

@app.post("/report", status_code=status.HTTP_204_NO_CONTENT)
async def report_user(body: ReportIn, user: CurrentUser):
    """الإبلاغ عن مستخدم — يُحفظ في DB ويُرسل إشعاراً للأدمن"""
    if body.target_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    target = await db.get_user(body.target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # حفظ البلاغ في قاعدة البيانات أولاً
    report_id = await db.log_report(
        reporter_id = user.id,
        target_id   = body.target_id,
        reason      = body.reason,
        deal_id     = body.deal_id,
    )
    total_reports = await db.count_reports_against(body.target_id)
    logger.info(f"[API] report #{report_id} by {user.id} against {body.target_id} (total={total_reports})")

    asyncio.create_task(_notify_bot("user-report", body.deal_id or 0, user.id, extra={
        "report_id":    report_id,
        "reporter_id":  user.id,
        "target_id":    body.target_id,
        "target_uname": target.get("username", ""),
        "reason":       body.reason,
        "deal_id":      body.deal_id,
        "total_reports": total_reports,
    }))


# ── Lookup user by username ────────────────────────────────────
@app.get("/users/lookup")
async def lookup_user(username: str, user: CurrentUser):
    """البحث عن مستخدم بالـ username لإظهاره قبل إنشاء الصفقة"""
    uname = username.lstrip("@").strip()
    row = await db.get_user_by_username(uname)
    if not row:
        raise HTTPException(status_code=404, detail=f"User @{uname} not found")
    if row["user_id"] == user.id:
        raise HTTPException(status_code=400, detail="That's your own account")
    return {"user_id": row["user_id"], "username": row.get("username", "")}


# ── مراقبة الدفع (تُشغَّل بعد قبول المشتري من Mini App) ────────
async def _api_monitor_payment(deal_id: int):
    deal = await db.get_deal(deal_id)
    if not deal:
        return

    async def on_paid(did: int):
        from aiogram import Bot as TGBot
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
        changed = await db.transition_deal_status(
            did, from_status="WAITING_PAYMENT", to_status="PAID", actor_id=0
        )
        if not changed:
            return
        logger.info(f"[Monitor] deal #{did} PAID ✅")
        asyncio.create_task(_api_monitor_gift_timeout(did))
        # إشعار البوت
        try:
            from config import BOT_TOKEN, MINIAPP_URL
            import json as _json, re as _re
            tgbot = TGBot(token=BOT_TOKEN)
            app_url = MINIAPP_URL or "https://web-production-7ecf2.up.railway.app/"
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="🚀 Open App", web_app=WebAppInfo(url=app_url))
            ]])
            d = await db.get_deal(did)

            # استخراج الاسم المقروء وصورة العنصر
            def _slug(desc):
                m = _re.search(r't\.me/nft/([a-zA-Z0-9\-]+)', desc or '', _re.I)
                return m.group(1) if m else ''
            def _display_name(deal):
                tp = deal.get("item_type","gift"); desc = deal.get("gift_desc","")
                raw = deal.get("item_meta"); meta = {}
                if raw:
                    try: meta = _json.loads(raw) if isinstance(raw,str) else raw
                    except: pass
                if tp == "gift":
                    s = _slug(desc)
                    return _re.sub(r'-\d+$','',s).replace('-',' ').title() if s else desc
                if tp in ("channel","group"):
                    return meta.get("title") or desc
                return desc
            def _photo_url(deal):
                tp = deal.get("item_type","gift"); desc = deal.get("gift_desc","")
                raw = deal.get("item_meta"); meta = {}
                if raw:
                    try: meta = _json.loads(raw) if isinstance(raw,str) else raw
                    except: pass
                if tp in ("channel","group"):
                    p = meta.get("photo_url")
                    if p: return f"{(MINIAPP_URL or '').rstrip('/')}{p}" if p.startswith('/') else p
                s = _slug(desc)
                if s: return f"{(MINIAPP_URL or '').rstrip('/')}/nft-image/{s}"
                return None

            item_name = _display_name(d)
            photo = _photo_url(d)
            seller_text = f"💰 Payment received for Deal #{did}!\n\n🎁 {item_name}\n\nPlease send the gift and mark it sent in the app."
            try:
                if photo:
                    await tgbot.send_photo(d["seller_id"], photo=photo, caption=seller_text, reply_markup=kb)
                else:
                    await tgbot.send_message(d["seller_id"], seller_text, reply_markup=kb)
            except Exception:
                await tgbot.send_message(d["seller_id"], seller_text, reply_markup=kb)
            await tgbot.send_message(d["buyer_id"],
                f"✅ Payment confirmed for Deal #{did}!\n\nWaiting for seller to send the gift.")
            await tgbot.session.close()
        except Exception as e:
            logger.error(f"[Monitor] notify failed: {e}")

    async def on_timeout(did: int):
        await db.transition_deal_status(
            did, from_status="WAITING_PAYMENT", to_status="EXPIRED", actor_id=0
        )
        logger.warning(f"[Monitor] deal #{did} EXPIRED")

    await monitor.watch_payment(
        deal_id=deal_id,
        expected_amount_ton=deal["amount_ton"],
        on_paid=on_paid,
        on_timeout=on_timeout,
        timeout_minutes=DEAL_TIMEOUT_MINUTES,
    )


async def _api_monitor_gift_timeout(deal_id: int):
    await asyncio.sleep(GIFT_TIMEOUT_MINUTES * 60)
    changed = await db.transition_deal_status(
        deal_id, from_status="GIFT_SENT", to_status="EXPIRED", actor_id=0
    )
    if changed:
        logger.warning(f"[Monitor] deal #{deal_id} gift timeout EXPIRED")

# ════════════════════════════════════════════════════════════════
#  Global error handler — لا تُسرّب stack traces للعميل
# ════════════════════════════════════════════════════════════════
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.exception(f"[API] Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ════════════════════════════════════════════════════════════════
#  Mini App static files — يُسجَّل أخيراً ليأخذ أولوية أقل من /api routes
# ════════════════════════════════════════════════════════════════
_MINIAPP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "miniapp")
if os.path.isdir(_MINIAPP_DIR):
    app.mount("/", StaticFiles(directory=_MINIAPP_DIR, html=True), name="miniapp")
    logger.info(f"[API] ✅ Serving Mini App static files from {_MINIAPP_DIR}")
else:
    logger.warning(f"[API] ⚠️ miniapp directory not found at {_MINIAPP_DIR}")
