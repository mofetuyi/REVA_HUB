"""Anti-Disintermediation and Supervision Engine for Reva Marketplace.

Enforces strict platform integrity by preventing buyers and sellers from
sharing phone numbers, bank accounts, external social media handles, or
arranging off-platform payments that bypass Reva Escrow.
"""

import re
import logging
from typing import Tuple, List

logger = logging.getLogger("moderation")

# 1. Phone number patterns:
# - Standard Nigerian formats: +23480..., 23480..., 080..., 070..., 090..., 081...
# - Spaced / dotted digits: 0 8 0 1 2 3 4 5 6 7 8
# - 10-11 consecutive digits
PHONE_REGEX = re.compile(
    r'(?:\+?234[\s\-\.\(\)]*|0[\s\-\.\(\)]*)[789][01](?:[\s\-\.\(\)]*\d){8}\b|\b0[1-9](?:[\s\-\.\(\)]*\d){8,9}\b|\b\+?234(?:[\s\-\.\(\)]*\d){10}\b',
    re.IGNORECASE
)

# Spelled out numbers in English / Nigerian slang (e.g., "zero eight zero", "oh eight oh")
SPELLED_NUMBERS_REGEX = re.compile(
    r'\b(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b',
    re.IGNORECASE
)

# 2. Bank account numbers (10-digit NUBAN)
NUBAN_REGEX = re.compile(r'\b\d{10}\b')

# 3. Bank mentions and money transfer keywords
BANK_KEYWORDS_REGEX = re.compile(
    r'\b(?:zenith|gtbank|gtb|kuda|opay|palmpay|access\s*bank|first\s*bank|uba|fcmb|fidelity|stanbic|wema|sterling|moniepoint)\b',
    re.IGNORECASE
)

# 4. Off-platform contact channels and external messaging
OFF_PLATFORM_CHANNELS = re.compile(
    r'\b(?:whatsapp|wa\.me|telegram|t\.me|instagram|ig|tiktok|twitter|snapchat|facebook|fb|call\s*me|reach\s*me\s*on|chat\s*me\s*on|dm\s*me|send\s*to\s*my\s*account|acct\s*no|outside\s*reva|direct\s*transfer|cash\s*on\s*delivery)\b',
    re.IGNORECASE
)

# 5. Email addresses
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# 6. External URLs
URL_REGEX = re.compile(r'(?:https?:\/\/|www\.)[^\s]+', re.IGNORECASE)


def supervise_message(text: str) -> Tuple[str, bool, List[str]]:
    """Analyzes a message for off-platform contact leaks or escrow bypass attempts.
    
    Returns:
        sanitized_text: The message with sensitive info redacted.
        is_flagged: True if an attempt was intercepted.
        reasons: List of identified violation reasons.
    """
    if not text:
        return text, False, []

    sanitized = text
    reasons = []
    flagged = False

    # Check for phone numbers
    if PHONE_REGEX.search(sanitized):
        flagged = True
        reasons.append("Attempted to share phone number")
        sanitized = PHONE_REGEX.sub("[🛡️ Phone Number Hidden by Reva Escrow Policy]", sanitized)

    # Check for spelled-out numbers
    if SPELLED_NUMBERS_REGEX.search(sanitized):
        flagged = True
        reasons.append("Attempted to spell out phone number")
        sanitized = SPELLED_NUMBERS_REGEX.sub("[🛡️ Contact Details Hidden by Reva Policy]", sanitized)

    # Check for bank accounts
    if NUBAN_REGEX.search(sanitized) and (BANK_KEYWORDS_REGEX.search(text) or "account" in text.lower() or "acct" in text.lower()):
        flagged = True
        reasons.append("Attempted to share bank account number")
        sanitized = NUBAN_REGEX.sub("[🛡️ Bank Account Redacted - Use Reva Escrow]", sanitized)

    # Check for off-platform channel keywords
    if OFF_PLATFORM_CHANNELS.search(text):
        flagged = True
        reasons.append("Attempted off-platform communication / direct transfer")

    # Check for email addresses
    if EMAIL_REGEX.search(sanitized):
        flagged = True
        reasons.append("Attempted to share email address")
        sanitized = EMAIL_REGEX.sub("[🛡️ Email Redacted for Safety]", sanitized)

    # Check for external URLs
    if URL_REGEX.search(sanitized):
        flagged = True
        reasons.append("Attempted to share external URL link")
        sanitized = URL_REGEX.sub("[🛡️ Link Blocked]", sanitized)

    if flagged:
        logger.warning("Message supervision alert: %s in text '%s'", ", ".join(reasons), text[:100])

    return sanitized, flagged, reasons
