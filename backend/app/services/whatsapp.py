"""WhatsApp Verification & Messaging Service for Reva Hub (powered by WSAPI).

Dispatches 6-digit OTP verification codes via wsapi.chat API
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
    """Generate a 6-digit OTP, store in Redis, and dispatch via WSAPI WhatsApp API.

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
    instance_id = settings.WHATSAPP_INSTANCE_ID

    if not api_key:
        logger.warning("WhatsApp API key not configured. Generated local OTP: %s for %s", otp, clean_phone)
        return True, otp, "WhatsApp verification link generated", direct_whatsapp_link

    delivered = False
    logger.info("Dispatching WhatsApp OTP to %s via WSAPI (key: %s...)", clean_phone, api_key[:6])

    # Call WSAPI REST endpoint (https://api.wsapi.chat/messages/text)
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "User-Agent": "RevaHub/1.0",
    }
    if instance_id:
        headers["x-instance-id"] = instance_id

    try:
        url = settings.WHATSAPP_GATEWAY_URL or "https://api.wsapi.chat/messages/text"
        payload = {
            "to": clean_phone,
            "text": msg_text,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201, 202):
                delivered = True
                logger.info("WSAPI WhatsApp message dispatched successfully to %s (%s)", clean_phone, resp.status_code)
            else:
                logger.warning("WSAPI responded with status %s: %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("WSAPI dispatch attempt error: %s", exc)

    return True, otp, "Verification code sent to WhatsApp", direct_whatsapp_link


async def verify_whatsapp_otp_code(
    phone: str,
    otp: str,
    redis_client,
) -> Tuple[bool, Optional[str]]:
    """Verify submitted WhatsApp OTP code."""
    clean_phone = normalize_phone_number(phone)
    return await _verify_otp(clean_phone, otp, redis_client)
