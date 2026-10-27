"""Payment service – Paystack integration.

NOTE: Paystack's standard Checkout + Transfer flow is used here.
True escrow behavior (funds held until release trigger) requires
verification with Paystack before production use.
ESCROW_AUTO_RELEASE_ENABLED must be False until confirmed.
"""

import hashlib
import hmac
import logging
import httpx
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)

PAYSTACK_BASE = "https://api.paystack.co"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.PAYMENT_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def create_checkout(
    order_id: str,
    amount_ngn: float,
    customer_email: str,
    callback_url: str,
    metadata: dict | None = None,
) -> dict:
    """Initialize a Paystack transaction. Returns checkout URL and reference.

    NOTE: This initializes a standard payment. Escrow behavior TBD with provider.
    """
    if not settings.payment_configured:
        logger.warning("Payment provider not configured. Returning mock checkout.")
        return {
            "checkout_url": f"{settings.FRONTEND_URL}/orders/{order_id}?mock_payment=true",
            "reference": f"mock_{order_id[:8]}",
            "configured": False,
        }

    # Paystack amounts are in kobo (1 NGN = 100 kobo)
    amount_kobo = int(amount_ngn * 100)

    payload = {
        "email": customer_email,
        "amount": amount_kobo,
        "callback_url": callback_url,
        "metadata": {
            "order_id": order_id,
            "cancel_action": f"{settings.FRONTEND_URL}/orders/{order_id}",
            **(metadata or {}),
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            headers=_headers(),
            json=payload,
        )

    data = resp.json()
    if not data.get("status"):
        logger.error("Paystack initialize failed: %s", data)
        raise ValueError(f"Payment initialization failed: {data.get('message', 'Unknown error')}")

    return {
        "checkout_url": data["data"]["authorization_url"],
        "reference": data["data"]["reference"],
        "configured": True,
    }


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Validate Paystack webhook HMAC-SHA512 signature."""
    if not settings.PAYMENT_WEBHOOK_SECRET:
        logger.warning("PAYMENT_WEBHOOK_SECRET not set; webhook validation skipped in dev mode")
        return settings.is_development

    expected = hmac.new(
        settings.PAYMENT_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def verify_transaction(reference: str) -> dict:
    """Verify a transaction reference with Paystack."""
    if not settings.payment_configured:
        return {"status": "success", "amount": 0, "reference": reference}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers=_headers(),
        )

    return resp.json()


def calculate_fees(amount_ngn: float) -> dict:
    """Calculate all fees for an order amount."""
    return settings.calculate_fees(amount_ngn)
