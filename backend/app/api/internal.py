"""Internal API Router for n8n Automation and Background Workflows.

All endpoints require the 'X-Internal-Key' header matching settings.INTERNAL_API_KEY.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.deps import verify_internal_key
from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.services.payment import send_seller_payout

router = APIRouter(prefix="/internal", tags=["internal-automation"], dependencies=[Depends(verify_internal_key)])


@router.get("/health")
async def internal_health_check():
    """Verify n8n connection and internal API credentials."""
    return {
        "status": "connected",
        "service": "Reva Hub n8n Automation Gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "auth_type": "X-Internal-Key",
    }


@router.get("/db-test")
async def db_test():
    """Test raw database connection and return error traceback if failing."""
    import traceback
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text, select
        from app.models.user import User
        from app.models.listing import Listing
        async with AsyncSessionLocal() as session:
            r1 = await session.execute(text("SELECT 1;"))
            raw_val = r1.scalar()

            try:
                r2 = await session.execute(select(User).limit(1))
                u = r2.scalar_one_or_none()
                user_res = f"User query OK, found: {u.id if u else 'none'}"
            except Exception as eu:
                user_res = f"User query FAILED: {type(eu).__name__}: {eu}\n{traceback.format_exc()}"

            try:
                r3 = await session.execute(select(Listing).limit(1))
                l = r3.scalar_one_or_none()
                listing_res = f"Listing query OK, found: {l.id if l else 'none'}"
            except Exception as el:
                listing_res = f"Listing query FAILED: {type(el).__name__}: {el}\n{traceback.format_exc()}"

            return {
                "status": "ok",
                "raw_val": raw_val,
                "user_res": user_res,
                "listing_res": listing_res,
            }
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc(),
        }


@router.get("/stats/summary")
async def get_automation_summary(db: AsyncSession = Depends(get_db)):
    """Summary metrics for n8n digests and alerting."""
    # Active listings
    listing_count_result = await db.execute(
        select(func.count(Listing.id)).where(Listing.status == ListingStatus.active)
    )
    active_listings = listing_count_result.scalar() or 0

    # Orders count by status
    order_counts = {}
    for st in [OrderStatus.funded, OrderStatus.in_transit, OrderStatus.delivered, OrderStatus.completed, OrderStatus.disputed]:
        res = await db.execute(select(func.count(Order.id)).where(Order.status == st))
        order_counts[st.value] = res.scalar() or 0

    # Total completed GMV
    gmv_result = await db.execute(
        select(func.sum(Order.total_amount_naira)).where(Order.status == OrderStatus.completed)
    )
    total_gmv = float(gmv_result.scalar() or 0)

    # Pending payouts
    pending_payouts_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.completed,
            Order.seller_payout_status != "transferred"
        )
    )
    pending_payouts_count = pending_payouts_result.scalar() or 0

    return {
        "active_listings": active_listings,
        "orders": order_counts,
        "total_completed_gmv_naira": total_gmv,
        "pending_seller_payouts": pending_payouts_count,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/orders/pending-payouts")
async def list_pending_seller_payouts(db: AsyncSession = Depends(get_db)):
    """Fetch completed orders where the 94% seller payout has not yet completed."""
    result = await db.execute(
        select(Order).where(
            Order.status == OrderStatus.completed,
            Order.seller_payout_status != "transferred"
        ).order_by(Order.completed_at.asc())
    )
    orders = result.scalars().all()

    return [
        {
            "order_id": str(o.id),
            "order_reference": o.order_reference,
            "seller_id": str(o.seller_id),
            "total_amount_naira": float(o.total_amount_naira),
            "seller_earnings_naira": float(o.seller_earnings_naira),
            "seller_payout_status": o.seller_payout_status,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o in orders
    ]


@router.post("/orders/{order_id}/trigger-payout")
async def trigger_payout(order_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger Paystack 94% seller transfer for an order via n8n automation."""
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order UUID")

    result = await db.execute(select(Order).where(Order.id == oid))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payout_res = await send_seller_payout(
        order_id=str(order.id),
        seller_id=str(order.seller_id),
        amount_naira=float(order.seller_earnings_naira or (float(order.total_amount_naira) * 0.94)),
        currency=order.currency or "NGN",
    )

    order.seller_payout_reference = payout_res.get("reference")
    order.seller_payout_status = payout_res.get("status", "pending")
    await db.commit()

    return {
        "status": "payout_triggered",
        "order_id": str(order.id),
        "seller_payout_reference": order.seller_payout_reference,
        "seller_payout_status": order.seller_payout_status,
        "details": payout_res,
    }


@router.get("/listings/recent")
async def get_recent_listings(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Fetch recent listings for n8n notifications (e.g. Discord, Telegram, or WhatsApp alerts)."""
    result = await db.execute(
        select(Listing).order_by(Listing.created_at.desc()).limit(limit)
    )
    listings = result.scalars().all()

    return [
        {
            "id": str(l.id),
            "title": l.title,
            "material_type": l.material_type,
            "category": l.category,
            "price_naira": float(l.price_naira),
            "state": l.state,
            "lga": l.lga,
            "status": l.status.value,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in listings
    ]
