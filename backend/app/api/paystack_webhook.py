import hmac
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Header, Response
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.order import Order, OrderStatus, OrderEvent

router = APIRouter(tags=["paystack_webhook"])
logger = logging.getLogger(__name__)

SECRET_KEY = "sk_test_705cc6033f529b9cd756010cf4019eb22bb14f08"

@router.post("/api/paystack-webhook")
@router.post("/paystack-webhook")
async def paystack_webhook(request: Request, x_paystack_signature: str = Header(None)):
    # 1. Capture the exact raw byte string sent by Paystack
    raw_body = await request.body()
    
    # 2. Compute local hash signature
    computed_signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        raw_body,
        hashlib.sha512
    ).hexdigest()

    # 3. Check for unauthorized access
    if computed_signature != x_paystack_signature:
        raise HTTPException(status_code=401, detail="Invalid Signature")

    # 4. Success. Parse JSON data out of raw bytes
    event = await request.json()
    
    if event.get("event") == "charge.success":
        data = event.get("data")
        reference = data.get("reference")
        amount = data.get("amount")
        
        # --- YOUR DATABASE LOGIC HERE ---
        # Deliver digital goods or fund wallet.
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                customer = data.get("customer", {})
                cust_email = (customer.get("email") or "").strip().lower()
                metadata = data.get("metadata", {}) or {}

                # Check custom fields for reva_id
                reva_id = None
                for field in metadata.get("custom_fields", []):
                    if field.get("variable_name") == "reva_id_number" or field.get("display_name") == "REVA ID number":
                        reva_id = str(field.get("value", "")).strip()

                # 1. Check if user exists to activate Premium
                user = None
                if reva_id:
                    user = (await db.execute(select(User).where(User.reva_id == reva_id))).scalar_one_or_none()
                if not user and cust_email:
                    user = (await db.execute(select(User).where(User.email == cust_email))).scalar_one_or_none()

                if user and amount and amount >= 300000:
                    base = user.premium_expires_at if (user.premium_expires_at and user.premium_expires_at > now) else now
                    user.is_premium = True
                    user.premium_activated_at = now
                    user.premium_expires_at = base + timedelta(days=30)
                    user.premium_payment_reference = reference
                    await db.commit()
                    logger.info("Paystack webhook: Activated Premium for user %s (ref=%s)", user.id, reference)

                # 2. Check if matching order exists to fund escrow
                order = (await db.execute(select(Order).where(Order.payment_reference == reference))).scalar_one_or_none()
                if not order and metadata.get("order_id"):
                    try:
                        import uuid
                        order_uuid = uuid.UUID(str(metadata["order_id"]))
                        order = (await db.execute(select(Order).where(Order.id == order_uuid))).scalar_one_or_none()
                    except Exception:
                        pass

                if order and order.status != OrderStatus.funded:
                    order.status = OrderStatus.funded
                    order.payment_reference = reference
                    order.payment_provider = "paystack"
                    order.funded_at = now
                    event_rec = OrderEvent(
                        order_id=order.id,
                        event_type="funded",
                        actor_id=order.buyer_id,
                        description=f"Order funded ₦{(amount or 0) / 100:,.2f} via Paystack Webhook (ref: {reference}). Funds secured in Reva Escrow.",
                        metadata={"reference": reference, "amount_kobo": amount},
                    )
                    db.add(event_rec)
                    await db.commit()
                    logger.info("Paystack webhook: Funded order %s (ref=%s)", order.id, reference)
        except Exception as exc:
            logger.error("Paystack webhook processing error: %s", exc)

    return Response(status_code=200)
