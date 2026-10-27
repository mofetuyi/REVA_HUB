"""ARQ background job worker for Reva.

Jobs:
- expire_listings: expire listings past their expires_at
- expire_offers: expire offers past their expires_at
- send_delivery_reminders: remind buyers to confirm delivery
- escalate_disputes: escalate disputes over 30 days old
- check_verified_seller_badges: recompute badges daily
- auto_release_escrow: DISABLED by default (ESCROW_AUTO_RELEASE_ENABLED=false)
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


async def expire_listings(ctx):
    """Mark listings expired if past expires_at and no active orders."""
    from app.core.database import AsyncSessionLocal
    from app.models.listing import Listing, ListingStatus
    from app.models.order import Order, OrderStatus
    from sqlalchemy import select, and_, not_, exists

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        active_order_statuses = [
            OrderStatus.created, OrderStatus.payment_pending, OrderStatus.funded,
            OrderStatus.in_transit, OrderStatus.delivered, OrderStatus.confirmed,
            OrderStatus.disputed,
        ]

        # Find listings past expiry with no blocking active orders
        q = await db.execute(
            select(Listing).where(
                Listing.status == ListingStatus.active,
                Listing.expires_at < now,
                ~exists(
                    select(Order.id).where(
                        Order.listing_id == Listing.id,
                        Order.status.in_(active_order_statuses),
                    )
                ),
            )
        )
        listings = q.scalars().all()
        count = 0
        for listing in listings:
            listing.status = ListingStatus.expired
            count += 1
        await db.commit()
        logger.info("Expired %d listings", count)


async def expire_offers(ctx):
    """Mark pending offers expired past their expires_at."""
    from app.core.database import AsyncSessionLocal
    from app.models.offer import Offer, OfferStatus
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        q = await db.execute(
            select(Offer).where(
                Offer.status == OfferStatus.pending,
                Offer.expires_at < now,
            )
        )
        offers = q.scalars().all()
        count = 0
        for offer in offers:
            offer.status = OfferStatus.expired
            count += 1
        await db.commit()
        logger.info("Expired %d offers", count)


async def send_delivery_reminders(ctx):
    """Remind buyers who haven't confirmed delivery after DELIVERY_REMINDER_DAYS."""
    from app.core.database import AsyncSessionLocal
    from app.core.config import settings
    from app.models.order import Order, OrderStatus
    from app.services.email import send_order_notification
    from app.models.user import User
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=settings.DELIVERY_REMINDER_DAYS)

        q = await db.execute(
            select(Order).where(
                Order.status == OrderStatus.in_transit,
                Order.funded_at < cutoff,
                Order.reminder_sent_at.is_(None),
            )
        )
        orders = q.scalars().all()
        count = 0
        for order in orders:
            buyer_result = await db.execute(select(User).where(User.id == order.buyer_id))
            buyer = buyer_result.scalar_one_or_none()
            if buyer:
                await send_order_notification(order, "reminder", buyer)
            order.reminder_sent_at = now
            count += 1
        await db.commit()
        logger.info("Sent %d delivery reminders", count)


async def escalate_disputes(ctx):
    """Escalate disputes open for more than 30 days."""
    from app.core.database import AsyncSessionLocal
    from app.models.dispute import Dispute, DisputeStatus
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        q = await db.execute(
            select(Dispute).where(
                Dispute.status.in_([DisputeStatus.open, DisputeStatus.under_review]),
                Dispute.created_at < cutoff,
                Dispute.escalated_at.is_(None),
            )
        )
        disputes = q.scalars().all()
        count = 0
        for dispute in disputes:
            dispute.status = DisputeStatus.escalated
            dispute.escalated_at = datetime.now(timezone.utc)
            count += 1
        await db.commit()
        logger.info("Escalated %d disputes", count)


async def check_verified_seller_badges(ctx):
    """Recompute verified seller badges for active sellers."""
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.services.verified_seller import check_and_update_badge
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        q = await db.execute(select(User).where(User.is_seller.is_(True), User.is_active.is_(True)))
        sellers = q.scalars().all()
        count = 0
        for seller in sellers:
            await check_and_update_badge(str(seller.id), db)
            count += 1
        logger.info("Checked verified seller badges for %d sellers", count)


async def auto_release_escrow(ctx):
    """
    PROVISIONAL – DISABLED by default.

    OPEN DECISION: Escrow auto-release trigger is unresolved.
    This job must NOT be enabled until:
    1. The final trigger rule is confirmed (after order creation vs. after buyer confirmation)
    2. The payment provider confirms escrow release capability for Nigeria
    3. An admin explicitly sets ESCROW_AUTO_RELEASE_ENABLED=true

    Never release escrow while an active dispute exists.
    """
    from app.core.config import settings

    if not settings.ESCROW_AUTO_RELEASE_ENABLED:
        logger.info(
            "auto_release_escrow: DISABLED (ESCROW_AUTO_RELEASE_ENABLED=false). "
            "No escrow releases processed. This is the safe default."
        )
        return

    # --- Real release logic (only runs if explicitly enabled) ---
    from app.core.database import AsyncSessionLocal
    from app.models.order import Order, OrderStatus, OrderEvent
    from app.models.dispute import Dispute, DisputeStatus
    from sqlalchemy import select, and_

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        q = await db.execute(
            select(Order).where(
                Order.status == OrderStatus.confirmed,
                Order.auto_release_at.is_not(None),
                Order.auto_release_at <= now,
            )
        )
        orders = q.scalars().all()
        count = 0
        for order in orders:
            # Never release while dispute exists
            dispute_result = await db.execute(
                select(Dispute).where(
                    Dispute.order_id == order.id,
                    Dispute.status.in_([DisputeStatus.open, DisputeStatus.under_review, DisputeStatus.escalated]),
                )
            )
            if dispute_result.scalar_one_or_none():
                logger.warning("Order %s has active dispute – escrow NOT released", order.id)
                continue

            order.status = OrderStatus.released
            event = OrderEvent(
                order_id=order.id,
                event_type="auto_released",
                description="Escrow auto-released after configured hold period",
            )
            db.add(event)
            count += 1
        await db.commit()
        logger.info("Auto-released escrow for %d orders", count)


class WorkerSettings:
    """ARQ worker settings."""
    functions = [
        expire_listings,
        expire_offers,
        send_delivery_reminders,
        escalate_disputes,
        check_verified_seller_badges,
        auto_release_escrow,
    ]
    cron_jobs = [
        # Run every hour
        {"coroutine": expire_offers, "name": "expire_offers", "minute": {0}},
        # Run daily at 2am
        {"coroutine": expire_listings, "name": "expire_listings", "hour": {2}, "minute": {0}},
        {"coroutine": send_delivery_reminders, "name": "delivery_reminders", "hour": {9}, "minute": {0}},
        {"coroutine": escalate_disputes, "name": "escalate_disputes", "hour": {3}, "minute": {0}},
        {"coroutine": check_verified_seller_badges, "name": "seller_badges", "hour": {4}, "minute": {0}},
        {"coroutine": auto_release_escrow, "name": "escrow_release", "hour": {5}, "minute": {0}},
    ]
