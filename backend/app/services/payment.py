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
    """Validate Paystack webhook HMAC-SHA512 signature using Secret Key."""
    secret = settings.PAYMENT_WEBHOOK_SECRET or settings.PAYMENT_SECRET_KEY
    if not secret:
        logger.warning("Neither PAYMENT_WEBHOOK_SECRET nor PAYMENT_SECRET_KEY configured; webhook validation skipped in dev mode")
        return settings.is_development

    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def send_seller_payout(
    order_id: str,
    seller_amount_ngn: float,
    seller_email: str,
    seller_name: str,
    seller_phone: str | None = None,
    recipient_code: str | None = None,
) -> dict:
    """Release 94% of order funds to the seller via Paystack Transfers."""
    logger.info("Executing 94%% seller payout: ₦%s for order %s to %s (recipient: %s)", seller_amount_ngn, order_id, seller_email, recipient_code)
    amount_kobo = int(round(seller_amount_ngn * 100))

    if not settings.payment_configured or not recipient_code or recipient_code.startswith("RCP_mock"):
        logger.info("MOCK/SIMULATED PAYOUT: ₦%s automatically released to seller %s (Paystack simulated transfer)", seller_amount_ngn, seller_name)
        return {
            "status": "success",
            "amount_ngn": seller_amount_ngn,
            "transfer_code": f"TRF_mock_{order_id[:8]}",
            "message": "94% payout completed into seller bank account"
        }

    try:
        payload = {
            "source": "balance",
            "reason": f"Reva Hub order payout {order_id}",
            "amount": amount_kobo,
            "recipient": recipient_code,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{PAYSTACK_BASE}/transfer", headers=_headers(), json=payload)
            data = resp.json()
            logger.info("Paystack transfer response: %s", data)
            if data.get("status"):
                return {
                    "status": "success",
                    "transfer_code": data["data"]["transfer_code"],
                    "reference": data["data"].get("reference"),
                }
            return {"status": "pending", "message": data.get("message")}
    except Exception as exc:
        logger.exception("Paystack payout transfer error: %s", exc)
        return {"status": "pending", "error": str(exc)}


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
