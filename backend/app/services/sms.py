"""SMS OTP service.

In development mode (ENVIRONMENT=development), OTPs are logged to the console
instead of being sent to the SMS provider.

Supported providers: termii | africas_talking
"""

import logging
import httpx
from app.core.config import settings
from app.core.security import generate_and_store_otp, verify_otp as _verify_otp
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


async def send_otp(phone: str, redis_client) -> bool:
    """Generate OTP, store hashed in Redis, and dispatch via SMS provider.

    Returns True on success. In development mode only, logs OTP for testing.
    """
    otp = await generate_and_store_otp(phone, redis_client)

    if not settings.sms_configured:
        if settings.is_development:
            logger.warning(
                "⚠️  DEV MODE: SMS not sent. OTP for %s is: %s", phone, otp
            )
        else:
            logger.warning("SMS provider not configured in production. OTP dispatched without console logging.")
        return True

    message = f"Your Reva verification code is: {otp}. Valid for 10 minutes. Do not share this code."

    try:
        if settings.SMS_PROVIDER == "termii":
            return await _send_via_termii(phone, message)
        elif settings.SMS_PROVIDER == "africas_talking":
            return await _send_via_africas_talking(phone, message)
        else:
            logger.error("Unknown SMS provider: %s", settings.SMS_PROVIDER)
            return False
    except Exception as exc:
        logger.exception("Failed to send SMS OTP: %s", exc)
        return False


async def verify_otp_code(phone: str, otp: str, redis_client) -> tuple[bool, str | None]:
    """Verify the OTP submitted by the user. Returns (is_valid, error_message)."""
    return await _verify_otp(phone, otp, redis_client)


async def _send_via_termii(phone: str, message: str) -> bool:
    """Send SMS via Termii API."""
    payload = {
        "to": phone,
        "from": settings.SMS_SENDER_ID,
        "sms": message,
        "type": "plain",
        "channel": "generic",
        "api_key": settings.SMS_API_KEY,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post("https://api.ng.termii.com/api/sms/send", json=payload)
        if resp.status_code == 200:
            return True
        logger.error("Termii error: %s %s", resp.status_code, resp.text)
        return False


async def _send_via_africas_talking(phone: str, message: str) -> bool:
    """Send SMS via Africa's Talking API."""
    headers = {
        "apiKey": settings.SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }
    data = {
        "username": "reva",
        "to": phone,
        "message": message,
        "from": settings.SMS_SENDER_ID,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.africastalking.com/version1/messaging",
            headers=headers,
            data=data,
        )
        if resp.status_code == 201:
            return True
        logger.error("Africa's Talking error: %s %s", resp.status_code, resp.text)
        return False
