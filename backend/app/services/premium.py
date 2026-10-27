"""Reva Premium entitlement service.

Single source of truth for all Premium feature checks.
Every benefit must pass through has_premium_feature().
Gate benefits server-side in every endpoint, not only in the UI.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from app.models.user import User


class PremiumFeature(str, Enum):
    """Enumeration of every gatable Premium feature."""
    # Seller features
    VERIFIED_PREMIUM_BADGE = "verified_premium_badge"
    LISTING_BOOSTS = "listing_boosts"
    HIGHER_LISTING_LIMITS = "higher_listing_limits"
    BULK_CSV_UPLOAD = "bulk_csv_upload"
    SELLER_ANALYTICS = "seller_analytics"
    STOREFRONT_PAGE = "storefront_page"
    LOWER_COMMISSION = "lower_commission"
    # Buyer features
    SAVED_SEARCHES = "saved_searches"
    WANTED_REQUESTS = "wanted_requests"
    PRICE_INSIGHTS = "price_insights"
    BULK_REPEAT_ORDERS = "bulk_repeat_orders"
    # Learn features
    AD_FREE_LEARN = "ad_free_learn"
    PREMIUM_TUTORIALS = "premium_tutorials"
    DOWNLOADABLE_GUIDES = "downloadable_guides"
    SAVED_COLLECTIONS = "saved_collections"
    COMPLETION_CERTIFICATES = "completion_certificates"
    TUTORIAL_ANALYTICS = "tutorial_analytics"
    # Business features
    COLLECTION_SCHEDULING = "collection_scheduling"
    IMPACT_REPORT = "impact_report"
    # Support
    PRIORITY_SUPPORT = "priority_support"


def is_premium_active(user: Optional[User]) -> bool:
    """Return True only if user has Premium and it has not expired.
    
    A suspended/restricted user loses Premium benefits while restricted.
    """
    if user is None:
        return False
    if not getattr(user, "is_premium", False):
        return False
    if getattr(user, "is_restricted", False):
        return False
    expires_at = getattr(user, "premium_expires_at", None)
    if expires_at is None:
        return True
    return expires_at > datetime.now(timezone.utc)


def has_premium_feature(user: Optional[User], feature: PremiumFeature) -> bool:
    """Check whether a user has access to a specific Premium feature.
    
    All benefits pass through here so new features can be added or
    toggled without touching payment code.
    """
    if not is_premium_active(user):
        return False
    return True


def days_until_expiry(user: Optional[User]) -> Optional[int]:
    """Return number of days until Premium expires, or None if not Premium."""
    if not is_premium_active(user):
        return None
    expires_at = getattr(user, "premium_expires_at", None)
    if expires_at is None:
        return None
    delta = expires_at - datetime.now(timezone.utc)
    return max(0, delta.days)
