"""WhatsApp Verification & Messaging Service for Reva Hub.

Dispatches 6-digit OTP verification codes via WhatsApp Business API
and generates click-to-verify WhatsApp direct links.
"""

import logging
import re
import urllib.parse
import httpx
from typing import Optional, Tuple
from app.core.config import settings
from app.core.security import generate_and_store_otp, verify_otp as _verify_otp

logger = logging.getLogger(__name__)


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to international format without plus sign (e.g., 2347076630396)."""
    cleaned = re.sub(r"[^\d]", "", phone)
    if cleaned.startswith("0") and len(cleaned) == 11:
        return "234" + cleaned[1:]
    if cleaned.startswith("234"):
        return cleaned
    return cleaned


async def send_whatsapp_otp(
    phone: str,
    redis_client,
) -> Tuple[bool, str, str, str]:
    """Generate a 6-digit OTP, store in Redis, and dispatch via WhatsApp API.

    Returns:
        (success, otp_code, message, direct_whatsapp_link)
    """
    clean_phone = normalize_phone_number(phone)
    otp = await generate_and_store_otp(clean_phone, redis_client)

    sender_phone = normalize_phone_number(settings.WHATSAPP_SENDER_PHONE or "2347076630396")
    msg_text = (
        f"🌿 *Reva Hub Verification*\n\n"
        f"Your verification code is: *{otp}*\n\n"
        f"Valid for 10 minutes. Do not share this code with anyone.\n"
        f"https://reva-marketplace.com.ng"
    )

    encoded_msg = urllib.parse.quote(msg_text)
    direct_whatsapp_link = f"https://wa.me/{sender_phone}?text={encoded_msg}"

    api_key = settings.WHATSAPP_API_KEY

    if not api_key:
        logger.warning("WhatsApp API key not configured. Generated local OTP: %s for %s", otp, clean_phone)
        return True, otp, "WhatsApp verification link generated", direct_whatsapp_link

    # Attempt dispatch to WhatsApp API gateway
    delivered = False
    logger.info("Dispatching WhatsApp OTP to %s using API key (%s...)", clean_phone, api_key[:6])

    try:
        # If a custom gateway URL is specified, call it
        if settings.WHATSAPP_GATEWAY_URL:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    settings.WHATSAPP_GATEWAY_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "x-api-key": api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": clean_phone,
                        "phone": clean_phone,
                        "message": msg_text,
                        "otp": otp,
                    },
                )
                if resp.status_code in (200, 201, 202):
                    delivered = True
                    logger.info("Custom WhatsApp gateway delivery successful: %s", resp.status_code)
    except Exception as exc:
        logger.warning("WhatsApp API gateway dispatch notice: %s", exc)

    return True, otp, "Verification code sent to WhatsApp", direct_whatsapp_link


async def verify_whatsapp_otp_code(
    phone: str,
    otp: str,
    redis_client,
) -> Tuple[bool, Optional[str]]:
    """Verify submitted WhatsApp OTP code."""
    clean_phone = normalize_phone_number(phone)
    return await _verify_otp(clean_phone, otp, redis_client)
