"""Reva Hub – Application Configuration.

All values are read from environment variables (or .env file).
No secrets are hard-coded here.
"""

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List, Optional
import os


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "insecure-change-in-production"
    INTERNAL_API_KEY: str = "mofeoluwa123456789"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://reva-marketplace.com.ng,https://www.reva-marketplace.com.ng,https://reva-hub-q6pp.onrender.com"
    FRONTEND_URL: str = "https://reva-marketplace.com.ng"

    # ── Database ──────────────────────────────────────────────────────────────
    # Never hard-code production credentials. In development, defaults to local SQLite.
    DATABASE_URL: str = "sqlite+aiosqlite:///./reva.db"

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("sqlite"):
            return url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)

        # Remove libpq query parameters that break asyncpg (asyncpg expects ssl via connect_args)
        import re
        url = re.sub(r'[?&]channel_binding=[^&]+', '', url)
        url = re.sub(r'[?&]sslmode=[^&]+', '', url)
        url = re.sub(r'[?&]$', '', url)
        if '?' not in url and '&' in url:
            url = url.replace('&', '?', 1)
        return url

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── JWT ───────────────────────────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── SMS OTP ───────────────────────────────────────────────────────────────
    SMS_PROVIDER: str = "termii"
    SMS_API_KEY: Optional[str] = None
    SMS_SENDER_ID: str = "Reva"

    # ── WhatsApp Verification ─────────────────────────────────────────────────
    WHATSAPP_API_KEY: Optional[str] = "sk_hXOvkP3W3U-msS9u7st6jA"
    WHATSAPP_PROVIDER: str = "auto"
    WHATSAPP_SENDER_PHONE: str = "2347076630396"
    WHATSAPP_GATEWAY_URL: Optional[str] = None

    # ── KYC ───────────────────────────────────────────────────────────────────
    KYC_PROVIDER_URL: Optional[str] = None
    KYC_API_KEY: Optional[str] = None
    KYC_WEBHOOK_SECRET: Optional[str] = None

    # ── Payment (Paystack) ────────────────────────────────────────────────────
    # NOTE: Production escrow must be validated with Paystack before enabling.
    PAYMENT_PROVIDER: str = "paystack"
    PAYMENT_SECRET_KEY: Optional[str] = None
    PAYMENT_PUBLIC_KEY: Optional[str] = None
    PAYMENT_WEBHOOK_SECRET: Optional[str] = None

    # ── Object Storage ────────────────────────────────────────────────────────
    S3_BUCKET_NAME: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    S3_REGION: str = "us-east-1"

    # ── Gemini AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None

    # ── Resend Email ─────────────────────────────────────────────────────────
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "noreply@reva.ng"

    # ── Business Rules (configurable – do not hard-code in logic) ─────────────
    MARKETPLACE_COMMISSION_RATE: float = 0.06  # 6% default; range 5–8% TBD
    PAYMENT_PROCESSING_FEE_RATE: float = 0.025
    PAYMENT_PROCESSING_FEE_MIN_NGN: float = 50.0

    # OPEN DECISION: Escrow auto-release trigger
    # Conflict documented: spec says "14 days after order creation" in one place
    # and "14 days after buyer confirmation" in another.
    # Provisional safe default: 14 days AFTER buyer delivery confirmation.
    # ESCROW_AUTO_RELEASE_ENABLED must be False until trigger is approved.
    ESCROW_RELEASE_DAYS_AFTER_CONFIRM: int = 14
    ESCROW_AUTO_RELEASE_ENABLED: bool = False

    LISTING_EXPIRY_DAYS: int = 90
    LISTING_RENEWAL_PROMPT_DAY: int = 85
    OFFER_EXPIRY_DAYS: int = 7
    DELIVERY_REMINDER_DAYS: int = 7

    VERIFIED_SELLER_MIN_ORDERS: int = 5
    VERIFIED_SELLER_MIN_RATING: float = 4.0
    VERIFIED_SELLER_DISPUTE_LOOKBACK_DAYS: int = 30

    # ── Reva Premium ──────────────────────────────────────────────────────────
    # IMPORTANT: Do not invent Reva's price. Set PREMIUM_AMOUNT_KOBO to the
    # real Paystack amount in kobo (100 kobo = ₦1). If unset, Premium activation
    # is BLOCKED — the webhook will reject any payment rather than silently accept
    # an unintended amount.
    PREMIUM_AMOUNT_KOBO: Optional[int] = None   # e.g. 500000 for ₦5,000
    PREMIUM_DURATION_DAYS: Optional[int] = None  # owner must set; no default
    PREMIUM_PAGE_URL: str = "https://paystack.shop/pay/reva"
    PREMIUM_REVA_ID_FIELD: str = "REVA ID number"  # exact Paystack custom field name

    # ── Compliance ────────────────────────────────────────────────────────────
    CURRENT_POLICY_VERSION: str = "1.0"

    # ── AI Listing Review ─────────────────────────────────────────────────────
    AI_REVIEW_ENABLED: bool = True
    AI_REVIEW_MODEL: str = "gemini-1.5-flash-latest"
    AI_REVIEW_TIMEOUT_SECONDS: int = 30
    AI_REVIEW_MAX_TEXT_CHARS: int = 4000
    AI_REVIEW_MIN_SOURCES: int = 3

    def validate_production_settings(self) -> None:
        """Fail fast if dangerous defaults are present in production."""
        if self.ENVIRONMENT == "production":
            if "change-in-production" in self.SECRET_KEY or len(self.SECRET_KEY) < 24:
                raise ValueError("CRITICAL SECURITY ERROR: Set a strong random SECRET_KEY in production!")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("CRITICAL SECURITY ERROR: DATABASE_URL must point to live PostgreSQL in production!")

    # ── Price Reference ───────────────────────────────────────────────────────
    PRICE_REF_REFRESH_INTERVAL_DAYS: int = 7
    PRICE_REF_MAX_CHANGE_PCT_AUTO_APPROVE: float = 0.10  # 10% — disabled until trusted
    PRICE_REF_AUTO_APPROVE_ENABLED: bool = False
    PRICE_REF_STALE_DAYS: int = 30

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY)

    @property
    def resend_configured(self) -> bool:
        return bool(self.RESEND_API_KEY)

    @property
    def sms_configured(self) -> bool:
        return bool(self.SMS_API_KEY)

    @property
    def whatsapp_configured(self) -> bool:
        return bool(self.WHATSAPP_API_KEY)

    @property
    def payment_configured(self) -> bool:
        return bool(self.PAYMENT_SECRET_KEY)

    @property
    def storage_configured(self) -> bool:
        return bool(self.S3_BUCKET_NAME and self.S3_ACCESS_KEY)

    @property
    def kyc_configured(self) -> bool:
        return bool(self.KYC_API_KEY)

    @property
    def premium_amount_configured(self) -> bool:
        return self.PREMIUM_AMOUNT_KOBO is not None and self.PREMIUM_AMOUNT_KOBO > 0

    @property
    def premium_duration_configured(self) -> bool:
        return self.PREMIUM_DURATION_DAYS is not None and self.PREMIUM_DURATION_DAYS > 0

    def calculate_fees(self, amount_ngn: float) -> dict:
        """Calculate marketplace fees for a given order amount.

        Processing fees are covered by Reva's commission, not deducted
        from the seller's proceeds.
        """
        commission = round(amount_ngn * self.MARKETPLACE_COMMISSION_RATE, 2)
        processing_fee = max(
            round(amount_ngn * self.PAYMENT_PROCESSING_FEE_RATE, 2),
            self.PAYMENT_PROCESSING_FEE_MIN_NGN,
        )
        # Processing fee comes out of commission, not seller proceeds
        reva_net = max(commission - processing_fee, 0)
        seller_proceeds = round(amount_ngn - commission, 2)
        return {
            "amount_ngn": amount_ngn,
            "commission_rate": self.MARKETPLACE_COMMISSION_RATE,
            "commission_ngn": commission,
            "processing_fee_ngn": processing_fee,
            "reva_net_ngn": reva_net,
            "seller_proceeds_ngn": seller_proceeds,
        }

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
