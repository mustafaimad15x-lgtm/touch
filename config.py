import os
import sys

def _require(key: str) -> str:
    val = os.getenv(key, "").strip()
    if not val:
        print(f"[Config] ❌ المتغير البيئي '{key}' غير موجود — أضفه في ملف .env", file=sys.stderr)
        sys.exit(1)
    return val

# ── بوت تلجرام ──────────────────────────────
BOT_TOKEN = _require("BOT_TOKEN")
ADMIN_ID  = int(_require("ADMIN_ID"))

# ── قناة ومجموعة Hamogram ────────────────────
CHANNEL_ID = os.getenv("CHANNEL_ID", "")   # @HamoGramNews  — اختياري
GROUP_ID   = os.getenv("GROUP_ID",   "")   # @HamoGramChat  — اختياري

# ── محفظة GRAM (TON) ─────────────────────────
TON_WALLET_ADDRESS  = _require("TON_WALLET_ADDRESS")
TON_WALLET_MNEMONIC = os.getenv("TON_WALLET_MNEMONIC", "")

# ── TON Center API ───────────────────────────
TONCENTER_URL     = os.getenv(
    "TONCENTER_URL", "https://testnet.toncenter.com/api/v2"
)
TONCENTER_API_KEY = _require("TONCENTER_API_KEY")

# ── إعدادات الصفقة ───────────────────────────
FEE_PERCENT          = float(os.getenv("FEE_PERCENT",          "5"))
DEAL_TIMEOUT_MINUTES = int(os.getenv("DEAL_TIMEOUT_MINUTES",   "30"))
GIFT_TIMEOUT_MINUTES = int(os.getenv("GIFT_TIMEOUT_MINUTES",   "15"))

# ── حد أدنى لمبلغ الصفقة (يُستخدم في api.py للتحقق من المدخلات) ──
MIN_DEAL_AMOUNT_TON  = float(os.getenv("MIN_DEAL_AMOUNT_TON",  "0.01"))

# ── رابط الـ Mini App ─────────────────────────
MINIAPP_URL = os.getenv("MINIAPP_URL", "")

# ── Firebase (تطبيق الأندرويد) ────────────────
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "hamogram-ba159")
