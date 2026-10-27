"""Unit tests for AI listing review and price checks."""

import pytest
import json
from unittest.mock import patch, AsyncMock
from app.services.listing_review import _validate_review_output, _safe_needs_review, review_listing
from app.core.config import settings


def test_validate_review_output_valid():
    valid_payload = {
        "decision": "approve",
        "reasons": ["Meets all material guidelines"],
        "price_assessment": "fair",
        "suggested_price_range_ngn": {"min": 500, "max": 800},
        "policy_flags": [],
    }
    assert _validate_review_output(valid_payload) is True


def test_validate_review_output_invalid_decision():
    invalid_payload = {
        "decision": "auto_grant_admin",  # Invalid decision value
        "reasons": [],
        "price_assessment": "fair",
        "policy_flags": [],
    }
    assert _validate_review_output(invalid_payload) is False


def test_safe_needs_review_default():
    """Verify that safe fallback always returns needs_review and cannot_judge."""
    res = _safe_needs_review("Gemini API timeout")
    assert res["decision"] == "needs_review"
    assert res["price_assessment"] == "cannot_judge"
    assert "Gemini API timeout" in res["reasons"]


@pytest.mark.asyncio
async def test_review_listing_missing_gemini_key():
    """When GEMINI_API_KEY is not configured, it must safely default to needs_review."""
    with patch.object(settings, "GEMINI_API_KEY", None):
        listing_data = {
            "title": "Clean PET Bottles 50kg",
            "category": "plastic",
            "quantity": 50,
            "unit": "kg",
            "price_ngn": 10000,
            "lga": "Ikeja",
        }
        res = await review_listing(listing_data)
        assert res["decision"] == "needs_review"
        assert "not configured" in res["reasons"][0]
