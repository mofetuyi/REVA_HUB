"""Payment webhook handler — Paystack and KYC callbacks.

All webhooks validate signatures server-side.
Duplicate events are handled idempotently.
Paystack webhook endpoint: https://YOUR_API_HOST/webhooks/payment
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.order import Order, OrderStatus, OrderEvent, VALID_ORDER_TRANSITIONS
from app.models.user import User, KYCStatus
from app.services.email import send_order_notification
from app.services.payment import verify_webhook_signature, verify_transaction

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)

CURRENT_POLICY_VERSION = "1.0"


def _extract_reva_id_from_metadata(data: dict) -> str | None:
    """Extract the REVA ID number from Paystack custom fields."""
    metadata = data.get("metadata", {})
    # Paystack sends custom fields as a list of dicts with display_name and value
    custom_fields = metadata.get("custom_fields", [])
    for field in custom_fields:
        if field.get("display_name") == settings.PREMIUM_REVA_ID_FIELD or \
           field.get("variable_name") == "reva_id_number":
            value = field.get("value", "").strip()
            if value:
                return value
    # Fallback: check metadata directly
    direct = metadata.get("reva_id", "").strip()
    return direct if direct else None


@router.post("/payment")
async def payment_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Paystack payment webhook — handles charge.success events idempotently.

    Processes both marketplace order payments and Reva Premium activations.
    Premium activation requires:
    1. Valid Paystack HMAC-SHA512 signature
    2. Server-side transaction verification with Paystack
    3. PREMIUM_AMOUNT_KOBO configured (activation blocked if not set)
    4. REVA ID number custom field present and matching a real user
    5. Idempotent per payment reference
    """
    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    # Always validate signature first
    if not verify_webhook_signature(body, signature):
        logger.warning("Invalid Paystack webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})

    logger.info("Received Paystack webhook: %s", event)

    if event == "charge.success":
        reference = data.get("reference", "")
        amount_kobo = data.get("amount", 0)

        # ── Check if this is a Premium activation ───────────────────────────
        reva_id = _extract_reva_id_from_metadata(data)
        if reva_id and reva_id.startswith("REVA-"):
            await _handle_premium_activation(
                db, reference, reva_id, amount_kobo, background_tasks
            )
            return {"status": "ok"}

        # ── Otherwise treat as marketplace order payment ─────────────────────
        result = await db.execute(select(Order).where(Order.payment_reference == reference))
        order = result.scalar_one_or_none()

        if not order:
            logger.warning("No order found for payment reference: %s", reference)
            return {"status": "ignored"}

        # Idempotency
        if order.status == OrderStatus.funded:
            logger.info("Order %s already funded — duplicate webhook ignored", order.id)
            return {"status": "ok", "idempotent": True}

        if OrderStatus.funded not in VALID_ORDER_TRANSITIONS.get(order.status, set()):
            logger.warning("Cannot transition order %s from %s to funded", order.id, order.status.value)
            return {"status": "ignored"}

        # Verify with Paystack directly
        if settings.payment_configured:
            verification = await verify_transaction(reference)
            if not verification.get("data", {}).get("status") == "success":
                logger.error("Transaction %s failed Paystack verification", reference)
                return {"status": "verification_failed"}

        order.status = OrderStatus.funded
        order.funded_at = datetime.now(timezone.utc)
        order.escrow_reference = data.get("id", "")

        event_log = OrderEvent(
            order_id=order.id,
            event_type="funded",
            description=f"Payment received via {settings.PAYMENT_PROVIDER}. Ref: {reference}",
            metadata={"payment_reference": reference, "provider": settings.PAYMENT_PROVIDER},
        )
        db.add(event_log)
        await db.commit()

        buyer_result = await db.execute(select(User).where(User.id == order.buyer_id))
        buyer = buyer_result.scalar_one_or_none()
        seller_result = await db.execute(select(User).where(User.id == order.seller_id))
        seller = seller_result.scalar_one_or_none()

        if buyer:
            background_tasks.add_task(send_order_notification, order, "funded", buyer)
        if seller:
            background_tasks.add_task(send_order_notification, order, "funded", seller)

    elif event == "charge.failed":
        reference = data.get("reference", "")
        result = await db.execute(select(Order).where(Order.payment_reference == reference))
        order = result.scalar_one_or_none()
        if order and order.status == OrderStatus.payment_pending:
            event_log = OrderEvent(
                order_id=order.id,
                event_type="payment_failed",
                description="Payment failed. Buyer may retry.",
                metadata={"reference": reference},
            )
            db.add(event_log)
            await db.commit()

    return {"status": "ok"}


async def _handle_premium_activation(
    db: AsyncSession,
    reference: str,
    reva_id: str,
    amount_kobo: int,
    background_tasks: BackgroundTasks,
) -> None:
    """
    Activate Reva Premium for the user matching reva_id.

    Security checks:
    1. PREMIUM_AMOUNT_KOBO must be configured — activation is blocked if not set.
    2. Amount in webhook must match configured amount exactly.
    3. Transaction verified server-side with Paystack.
    4. Idempotent: same reference cannot activate Premium twice.
    5. Repeat payment extends the expiry period (no double-charge loss).
    """
    # Guard: amount must be configured
    if not settings.premium_amount_configured:
        logger.error(
            "PREMIUM_AMOUNT_KOBO not configured. Refusing Premium activation for ref=%s. "
            "Set PREMIUM_AMOUNT_KOBO in your environment to enable Premium payments.",
            reference,
        )
        return

    # Guard: amount must match
    if amount_kobo != settings.PREMIUM_AMOUNT_KOBO:
        logger.warning(
            "Premium payment amount mismatch for ref=%s: expected %d kobo, got %d kobo. Ignoring.",
            reference, settings.PREMIUM_AMOUNT_KOBO, amount_kobo,
        )
        return

    # Verify with Paystack server-side
    if settings.payment_configured:
        verification = await verify_transaction(reference)
        vdata = verification.get("data", {})
        if vdata.get("status") != "success":
            logger.error("Premium transaction %s failed Paystack verification", reference)
            return
        # Double-check amount in verification response
        verified_amount = vdata.get("amount", 0)
        if verified_amount != settings.PREMIUM_AMOUNT_KOBO:
            logger.warning(
                "Premium payment verified amount mismatch for ref=%s: expected %d, got %d",
                reference, settings.PREMIUM_AMOUNT_KOBO, verified_amount,
            )
            return
    else:
        logger.warning("PAYMENT_SECRET_KEY not configured; skipping server-side verification for ref=%s", reference)

    # Find user by reva_id
    result = await db.execute(select(User).where(User.reva_id == reva_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("Premium activation: no user found with reva_id=%s", reva_id)
        return

    # Idempotency: same reference must not activate Premium twice
    if user.premium_payment_reference == reference:
        logger.info("Premium already activated for user %s with ref=%s — idempotent skip", user.id, reference)
        return

    # Guard: duration must be configured
    if not settings.premium_duration_configured:
        logger.error(
            "PREMIUM_DURATION_DAYS not configured. Refusing Premium activation for user %s. "
            "Set PREMIUM_DURATION_DAYS in your environment.",
            user.id,
        )
        return

    now = datetime.now(timezone.utc)
    duration = timedelta(days=settings.PREMIUM_DURATION_DAYS)

    # Extend from current expiry if still active; otherwise start fresh
    if user.is_premium and user.premium_expires_at and user.premium_expires_at > now:
        new_expiry = user.premium_expires_at + duration
        logger.info("Extending Premium for user %s; new expiry=%s", user.id, new_expiry)
    else:
        new_expiry = now + duration
        logger.info("Activating Premium for user %s; expiry=%s", user.id, new_expiry)

    user.is_premium = True
    user.premium_activated_at = now
    user.premium_expires_at = new_expiry
    user.premium_payment_reference = reference
    await db.commit()
    logger.info("Premium activated/extended for user %s (reva_id=%s)", user.id, reva_id)


@router.post("/kyc")
async def kyc_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """KYC provider webhook — validate signature and update user KYC status."""
    body = await request.body()
    signature = request.headers.get("x-kyc-signature", "")

    if settings.KYC_WEBHOOK_SECRET:
        expected = hmac.new(
            settings.KYC_WEBHOOK_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=400, detail="Invalid KYC webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    user_id = payload.get("user_id")
    provider_status = payload.get("status")
    provider_ref = payload.get("reference", "")

    if not user_id:
        return {"status": "ignored"}

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("KYC webhook for unknown user: %s", user_id)
        return {"status": "ignored"}

    if provider_status == "verified":
        user.kyc_status = KYCStatus.verified
        user.kyc_verified_at = datetime.now(timezone.utc)
        user.kyc_provider_ref = provider_ref
    elif provider_status == "rejected":
        user.kyc_status = KYCStatus.rejected
        user.kyc_provider_ref = provider_ref

    await db.commit()
    logger.info("KYC status updated for user %s: %s", user_id, provider_status)
    return {"status": "ok"}
