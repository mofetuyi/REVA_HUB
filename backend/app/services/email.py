"""Email notification service using Resend.

In development mode or when RESEND_API_KEY is not configured, email content
is logged to the console instead of being sent.

Never put RESEND_API_KEY in frontend code or logs.
"""

import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)


def _configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def _log_fallback(to: str, subject: str, html: str) -> None:
    logger.warning(
        "⚠️  Resend not configured. Email to %s | Subject: %s | (content suppressed from logs)",
        to,
        subject,
    )


async def send_email(to: str, subject: str, html: str) -> bool:
    """Core send function. All other functions use this."""
    if not _configured() or settings.is_development:
        _log_fallback(to, subject, html)
        return True
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as exc:
        logger.exception("Resend error: %s", exc)
        return False


async def send_welcome_email(user) -> bool:
    subject = f"Welcome to Reva, {user.name}!"
    html = f"""
    <h1 style="color:#C9A227">Welcome to Reva 🌿</h1>
    <p>Hi {user.name},</p>
    <p>Thank you for joining Reva — Lagos's marketplace for recovered materials.</p>
    <p>You can now browse listings, make offers, and start learning on Reva Learn.</p>
    <p><a href="{settings.FRONTEND_URL}" style="color:#C9A227">Visit Reva</a></p>
    """
    return await send_email(user.email, subject, html) if user.email else True


async def send_otp_email(user, otp_code: str) -> bool:
    """Email OTP as supplement — phone OTP remains primary."""
    if not user.email:
        return True
    subject = "Your Reva Verification Code"
    html = f"""
    <h2 style="color:#C9A227">Reva Email Verification</h2>
    <p>Hi {user.name},</p>
    <p>Your verification code is: <strong style="font-size:24px">{otp_code}</strong></p>
    <p>This code is valid for 10 minutes. Phone verification is required to complete signup.</p>
    <p>Do not share this code with anyone.</p>
    """
    return await send_email(user.email, subject, html)


async def send_offer_notification(offer, event_type: str, recipient) -> bool:
    """Notify buyer or seller about an offer event."""
    if not recipient.email:
        return True
    subject_map = {
        "new_offer": "New offer on your listing",
        "offer_accepted": "Your offer was accepted!",
        "offer_rejected": "Your offer was declined",
        "offer_countered": "Counter-offer received",
    }
    subject = subject_map.get(event_type, "Offer update from Reva")
    html = f"""
    <h2 style="color:#C9A227">Reva Offer Update</h2>
    <p>Hi {recipient.name},</p>
    <p>An update on your offer: <strong>{event_type.replace('_', ' ').title()}</strong></p>
    <p><a href="{settings.FRONTEND_URL}/offers" style="color:#C9A227">View your offers</a></p>
    """
    return await send_email(recipient.email, subject, html)


async def send_order_notification(order, event_type: str, recipient) -> bool:
    """Notify buyer or seller about an order state change."""
    if not recipient.email:
        return True
    subject_map = {
        "funded": "Payment received – order confirmed",
        "in_transit": "Your order is on its way",
        "delivered": "Delivery marked – please confirm",
        "confirmed": "Delivery confirmed",
        "completed": "Order completed",
        "disputed": "A dispute has been raised",
        "refunded": "Refund processed",
        "reminder": "Reminder: Please confirm your delivery",
    }
    subject = subject_map.get(event_type, "Order update from Reva")
    html = f"""
    <h2 style="color:#C9A227">Reva Order Update</h2>
    <p>Hi {recipient.name},</p>
    <p>Order status: <strong>{event_type.replace('_', ' ').title()}</strong></p>
    <p><a href="{settings.FRONTEND_URL}/orders/{order.id}" style="color:#C9A227">View order</a></p>
    """
    return await send_email(recipient.email, subject, html)


async def send_dispute_notification(dispute, recipient) -> bool:
    if not recipient.email:
        return True
    subject = "A dispute has been raised on your order"
    html = f"""
    <h2 style="color:#DC2626">Reva Dispute Notice</h2>
    <p>Hi {recipient.name},</p>
    <p>A dispute has been raised on order #{str(dispute.order_id)[:8]}.</p>
    <p>Reason: <strong>{dispute.reason.replace('_', ' ').title()}</strong></p>
    <p><a href="{settings.FRONTEND_URL}/orders/{dispute.order_id}" style="color:#C9A227">View dispute</a></p>
    """
    return await send_email(recipient.email, subject, html)


async def send_kyc_status_email(user, status: str) -> bool:
    if not user.email:
        return True
    if status == "verified":
        subject = "Your identity has been verified on Reva"
        body = "Congratulations! Your identity verification is complete. You now qualify for the verified seller badge."
    else:
        subject = "Identity verification update from Reva"
        body = "We were unable to verify your identity. Please contact support for assistance."
    html = f"""
    <h2 style="color:#C9A227">Reva KYC Update</h2>
    <p>Hi {user.name},</p>
    <p>{body}</p>
    <p><a href="{settings.FRONTEND_URL}/kyc" style="color:#C9A227">View KYC status</a></p>
    """
    return await send_email(user.email, subject, html)
