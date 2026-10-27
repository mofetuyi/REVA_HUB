"""Verified seller badge computation service."""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.config import settings
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.dispute import Dispute, DisputeStatus

logger = logging.getLogger(__name__)


async def check_and_update_badge(user_id: str, db: AsyncSession) -> bool:
    """Check verified seller badge criteria and update the user record.

    Criteria:
    1. KYC status = verified
    2. >= VERIFIED_SELLER_MIN_ORDERS completed orders
    3. Average rating >= VERIFIED_SELLER_MIN_RATING
    4. No unresolved disputes in last VERIFIED_SELLER_DISPUTE_LOOKBACK_DAYS days

    OPEN DECISION: Whether badge affects search ranking — NOT applied here.
    """
    from app.models.user import KYCStatus

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False

    qualifies = (
        user.kyc_status == KYCStatus.verified
        and user.completed_orders_count >= settings.VERIFIED_SELLER_MIN_ORDERS
        and float(user.average_rating or 0) >= settings.VERIFIED_SELLER_MIN_RATING
    )

    if qualifies:
        # Check for unresolved disputes in lookback window
        lookback = datetime.now(timezone.utc) - timedelta(
            days=settings.VERIFIED_SELLER_DISPUTE_LOOKBACK_DAYS
        )
        dispute_result = await db.execute(
            select(func.count(Dispute.id))
            .join(Order, Dispute.order_id == Order.id)
            .where(
                Order.seller_id == user_id,
                Dispute.created_at >= lookback,
                Dispute.status.in_([DisputeStatus.open, DisputeStatus.under_review, DisputeStatus.escalated]),
            )
        )
        active_disputes = dispute_result.scalar()
        if active_disputes > 0:
            qualifies = False

    if qualifies and not user.is_verified_seller:
        user.is_verified_seller = True
        user.verified_seller_since = datetime.now(timezone.utc)
        logger.info("Verified seller badge awarded to user %s", user_id)
    elif not qualifies and user.is_verified_seller:
        user.is_verified_seller = False
        user.verified_seller_since = None
        logger.info("Verified seller badge removed from user %s", user_id)

    await db.commit()
    return user.is_verified_seller


async def update_user_rating(user_id: str, db: AsyncSession) -> None:
    """Recalculate and update a user's aggregate rating."""
    from app.models.review import Review, ReviewType

    result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(
            Review.reviewee_id == user_id,
            Review.review_type == ReviewType.buyer_reviews_seller,
            Review.is_public.is_(True),
        )
    )
    avg_rating, count = result.one()

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.average_rating = round(float(avg_rating or 0), 2)
        user.review_count = count or 0
        await db.commit()
