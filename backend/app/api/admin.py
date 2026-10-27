"""Admin API routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.listing import Listing, ModerationStatus, ListingStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.order import Order, OrderStatus, OrderEvent
from app.models.user import User
from app.models.tutorial import Tutorial, TutorialStatus

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


class ModerateListing(BaseModel):
    decision: str  # approve | reject
    notes: Optional[str] = None


class ResolveDispute(BaseModel):
    resolution: str  # refund | release
    notes: str


class ModerateUser(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_staff: Optional[bool] = None


class ModerateTutorial(BaseModel):
    action: str  # publish | reject | archive
    revision_notes: Optional[str] = None


@router.get("/stats")
async def dashboard_stats(
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    active_listings = (await db.execute(
        select(func.count(Listing.id)).where(Listing.status == ListingStatus.active)
    )).scalar()
    open_disputes = (await db.execute(
        select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.open)
    )).scalar()
    pending_listings = (await db.execute(
        select(func.count(Listing.id)).where(Listing.moderation_status == ModerationStatus.pending)
    )).scalar()
    pending_tutorials = (await db.execute(
        select(func.count(Tutorial.id)).where(Tutorial.status == TutorialStatus.pending_review)
    )).scalar()

    return {
        "total_users": total_users,
        "active_listings": active_listings,
        "open_disputes": open_disputes,
        "pending_listings_moderation": pending_listings,
        "pending_tutorials_review": pending_tutorials,
    }


@router.get("/listings")
async def admin_listings(
    moderation_status: Optional[str] = "pending",
    page: int = 1,
    page_size: int = 20,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if moderation_status:
        try:
            filters.append(Listing.moderation_status == ModerationStatus(moderation_status))
        except ValueError:
            pass

    q = await db.execute(
        select(Listing).where(*filters).order_by(Listing.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    listings = q.scalars().all()
    return [
        {
            "id": str(l.id),
            "title": l.title,
            "category": l.category.value,
            "seller_id": str(l.seller_id),
            "lga": l.lga,
            "price_ngn": float(l.price_ngn),
            "moderation_status": l.moderation_status.value,
            "status": l.status.value,
            "is_flagged": l.is_flagged,
            "flag_count": l.flag_count,
            "created_at": l.created_at.isoformat(),
        }
        for l in listings
    ]


@router.put("/listings/{listing_id}/moderate")
async def moderate_listing(
    listing_id: str,
    req: ModerateListing,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if req.decision == "approve":
        listing.moderation_status = ModerationStatus.approved
    elif req.decision == "reject":
        listing.moderation_status = ModerationStatus.rejected
        listing.status = ListingStatus.delisted
        listing.moderation_notes = req.notes
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")

    await db.commit()
    return {"message": f"Listing {req.decision}d"}


@router.get("/disputes")
async def admin_disputes(
    dispute_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if dispute_status:
        try:
            filters.append(Dispute.status == DisputeStatus(dispute_status))
        except ValueError:
            pass

    q = await db.execute(
        select(Dispute).where(*filters).order_by(Dispute.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    disputes = q.scalars().all()
    return [
        {
            "id": str(d.id),
            "order_id": str(d.order_id),
            "raised_by_id": str(d.raised_by_id),
            "reason": d.reason.value,
            "description": d.description,
            "status": d.status.value,
            "sla_deadline": d.sla_deadline.isoformat(),
            "created_at": d.created_at.isoformat(),
            "evidence_count": len(d.evidence) if d.evidence else 0,
        }
        for d in disputes
    ]


@router.put("/disputes/{dispute_id}")
async def resolve_dispute(
    dispute_id: str,
    req: ResolveDispute,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin resolves dispute as refund or release."""
    from datetime import datetime, timezone

    result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if dispute.status not in (DisputeStatus.open, DisputeStatus.under_review, DisputeStatus.escalated):
        raise HTTPException(status_code=400, detail=f"Cannot resolve dispute in status: {dispute.status.value}")

    if req.resolution not in ("refund", "release"):
        raise HTTPException(status_code=400, detail="Resolution must be 'refund' or 'release'")

    order_result = await db.execute(select(Order).where(Order.id == dispute.order_id))
    order = order_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    dispute.resolution = req.resolution
    dispute.resolution_notes = req.notes
    dispute.resolved_by_id = current_user.id
    dispute.resolved_at = now

    if req.resolution == "refund":
        dispute.status = DisputeStatus.resolved_refund
        if order:
            order.status = OrderStatus.refunded
            event = OrderEvent(
                order_id=order.id, event_type="refunded",
                actor_id=current_user.id,
                description=f"Admin resolved dispute as refund: {req.notes}",
            )
            db.add(event)
    else:
        dispute.status = DisputeStatus.resolved_release
        if order:
            order.status = OrderStatus.released
            event = OrderEvent(
                order_id=order.id, event_type="released",
                actor_id=current_user.id,
                description=f"Admin resolved dispute as release: {req.notes}",
            )
            db.add(event)

    await db.commit()
    return {"message": f"Dispute resolved as {req.resolution}"}


@router.get("/users")
async def admin_users(
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if search:
        term = f"%{search}%"
        from sqlalchemy import or_
        filters.append(or_(User.name.ilike(term), User.phone.ilike(term)))

    q = await db.execute(
        select(User).where(*filters).order_by(User.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    users = q.scalars().all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "phone": u.phone[:7] + "***" + u.phone[-2:],  # Redact PII in logs
            "lga": u.lga,
            "account_type": u.account_type.value,
            "kyc_status": u.kyc_status.value,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_staff": u.is_staff,
            "is_verified_seller": u.is_verified_seller,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.put("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    req: ModerateUser,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.is_active is not None:
        user.is_active = req.is_active
    if req.is_admin is not None:
        user.is_admin = req.is_admin
    if req.is_staff is not None:
        user.is_staff = req.is_staff

    await db.commit()
    return {"message": "User updated"}


@router.put("/learn/tutorials/{tutorial_id}")
async def admin_moderate_tutorial(
    tutorial_id: str,
    req: ModerateTutorial,
    current_user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    now = datetime.now(timezone.utc)
    if req.action == "publish":
        tutorial.status = TutorialStatus.published
        tutorial.published_at = now
    elif req.action == "reject":
        tutorial.status = TutorialStatus.draft
        tutorial.revision_notes = req.revision_notes
    elif req.action == "archive":
        tutorial.status = TutorialStatus.archived
        tutorial.archived_at = now
    else:
        raise HTTPException(status_code=400, detail="Action must be publish, reject, or archive")

    await db.commit()
    return {"message": f"Tutorial {req.action}d"}
