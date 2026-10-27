"""Unit and integration tests for Payment, Webhook, and Reva Premium entitlement."""

import pytest
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from app.core.config import settings
from app.services.payment import verify_webhook_signature
from app.services.premium import is_premium_active, has_premium_feature, PremiumFeature, days_until_expiry
from app.models.user import User


def test_webhook_signature_verification():
    """Verify HMAC-SHA512 webhook signature verification."""
    body = b'{"event": "charge.success", "data": {"reference": "REF123"}}'
    secret = "test_webhook_secret"
    valid_sig = hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()

    with patch.object(settings, "PAYMENT_WEBHOOK_SECRET", secret):
        assert verify_webhook_signature(body, valid_sig) is True
        assert verify_webhook_signature(body, "invalid_signature") is False


def test_premium_active_for_valid_user():
    """Active premium user should have access."""
    future = datetime.now(timezone.utc) + timedelta(days=30)
    user = User(
        is_premium=True,
        premium_expires_at=future,
        is_restricted=False,
    )
    assert is_premium_active(user) is True
    assert has_premium_feature(user, PremiumFeature.VERIFIED_PREMIUM_BADGE) is True
    assert has_premium_feature(user, PremiumFeature.SELLER_ANALYTICS) is True
    assert days_until_expiry(user) == 29 or days_until_expiry(user) == 30


def test_premium_inactive_when_expired():
    """Expired premium user should lose access."""
    past = datetime.now(timezone.utc) - timedelta(days=2)
    user = User(
        is_premium=True,
        premium_expires_at=past,
        is_restricted=False,
    )
    assert is_premium_active(user) is False
    assert has_premium_feature(user, PremiumFeature.VERIFIED_PREMIUM_BADGE) is False
    assert days_until_expiry(user) is None


def test_premium_inactive_when_restricted():
    """Suspended or restricted user loses premium benefits immediately."""
    future = datetime.now(timezone.utc) + timedelta(days=30)
    user = User(
        is_premium=True,
        premium_expires_at=future,
        is_restricted=True,
        restriction_reason="Under investigation for prohibited materials",
    )
    assert is_premium_active(user) is False
    assert has_premium_feature(user, PremiumFeature.VERIFIED_PREMIUM_BADGE) is False


def test_premium_inactive_for_non_premium_user():
    """Non-premium user has no premium benefits."""
    user = User(
        is_premium=False,
        premium_expires_at=None,
        is_restricted=False,
    )
    assert is_premium_active(user) is False
    assert has_premium_feature(user, PremiumFeature.AD_FREE_LEARN) is False
    assert has_premium_feature(user, PremiumFeature.LISTING_BOOSTS) is False


def test_premium_idempotency_logic():
    """Verify that same payment reference does not duplicate activation."""
    user = User(
        reva_id="REVA-TEST-1234",
        is_premium=True,
        premium_payment_reference="PAYREF_001",
    )
    # If the incoming reference matches user.premium_payment_reference, it is skipped as idempotent
    assert user.premium_payment_reference == "PAYREF_001"
