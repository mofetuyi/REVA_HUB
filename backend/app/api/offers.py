"""Offers API routes."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.offer import Offer, OfferStatus
from app.models.listing import Listing, ListingStatus
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.services.email import send_offer_notification

router = APIRouter(prefix="/offers", tags=["offers"])
logger = logging.getLogger(__name__)


class OfferCreate(BaseModel):
    listing_id: str
    proposed_price: float
    proposed_quantity: Optional[float] = None
    unit: Optional[str] = None
    message: Optional[str] = None


class OfferAction(BaseModel):
    action: str  # accept | reject | counter | withdraw
    counter_price: Optional[float] = None
    counter_quantity: Optional[float] = None
    counter_message: Optional[str] = None


def _offer_to_dict(offer: Offer) -> dict:
    return {
        "id": str(offer.id),
        "listing_id": str(offer.listing_id),
        "buyer_id": str(offer.buyer_id),
        "seller_id": str(offer.seller_id),
        "proposed_price": float(offer.proposed_price),
        "proposed_quantity": float(offer.proposed_quantity) if offer.proposed_quantity else None,
        "unit": offer.unit,
        "message": offer.message,
        "status": offer.status.value,
        "counter_price": float(offer.counter_price) if offer.counter_price else None,
        "counter_quantity": float(offer.counter_quantity) if offer.counter_quantity else None,
        "counter_message": offer.counter_message,
        "parent_offer_id": str(offer.parent_offer_id) if offer.parent_offer_id else None,
        "expires_at": offer.expires_at.isoformat(),
        "created_at": offer.created_at.isoformat(),
        "updated_at": offer.updated_at.isoformat(),
        "resolved_at": offer.resolved_at.isoformat() if offer.resolved_at else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_offer(
    req: OfferCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an offer on a listing."""
    # Fetch listing
    listing_result = await db.execute(select(Listing).where(Listing.id == req.listing_id))
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="This listing is not active")
    if str(listing.seller_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot make an offer on your own listing")

    if req.proposed_price <= 0:
        raise HTTPException(status_code=400, detail="Proposed price must be greater than zero")

    # Check for existing pending offer from this buyer
    existing = await db.execute(
        select(Offer).where(
            Offer.listing_id == listing.id,
            Offer.buyer_id == current_user.id,
            Offer.status == OfferStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have a pending offer on this listing")

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.OFFER_EXPIRY_DAYS)
    offer = Offer(
        listing_id=listing.id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        proposed_price=req.proposed_price,
        proposed_quantity=req.proposed_quantity,
        unit=req.unit or listing.unit.value,
        message=req.message,
        status=OfferStatus.pending,
        expires_at=expires_at,
    )
    db.add(offer)
    await db.commit()
    await db.refresh(offer)

    # Notify seller
    seller_result = await db.execute(select(User).where(User.id == listing.seller_id))
    seller = seller_result.scalar_one_or_none()
    if seller:
        background_tasks.add_task(send_offer_notification, offer, "new_offer", seller)

    return _offer_to_dict(offer)


@router.get("")
async def list_offers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List offers relevant to the current user (as buyer or seller)."""
    q = await db.execute(
        select(Offer).where(
            or_(Offer.buyer_id == current_user.id, Offer.seller_id == current_user.id)
        ).order_by(Offer.created_at.desc())
    )
    offers = q.scalars().all()
    return [_offer_to_dict(o) for o in offers]


@router.get("/{offer_id}")
async def get_offer(
    offer_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if str(offer.buyer_id) != str(current_user.id) and str(offer.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return _offer_to_dict(offer)


@router.put("/{offer_id}")
async def respond_to_offer(
    offer_id: str,
    req: OfferAction,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept, reject, counter, or withdraw an offer."""
    result = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    is_buyer = str(offer.buyer_id) == str(current_user.id)
    is_seller = str(offer.seller_id) == str(current_user.id)
    if not is_buyer and not is_seller:
        raise HTTPException(status_code=403, detail="Not authorized")

    if offer.status not in (OfferStatus.pending, OfferStatus.countered):
        raise HTTPException(status_code=400, detail=f"Offer cannot be actioned in status: {offer.status.value}")

    now = datetime.now(timezone.utc)

    if req.action == "accept":
        if is_buyer and offer.status == OfferStatus.pending:
            raise HTTPException(status_code=400, detail="Buyer cannot accept own offer")
        if is_seller and offer.status == OfferStatus.countered:
            raise HTTPException(status_code=400, detail="Seller cannot accept own counter")

        offer.status = OfferStatus.accepted
        offer.resolved_at = now

        # Create order from accepted offer
        price = offer.counter_price if offer.status == OfferStatus.countered and offer.counter_price else offer.proposed_price
        qty = offer.counter_quantity if offer.counter_quantity else offer.proposed_quantity

        listing_result = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
        listing = listing_result.scalar_one_or_none()

        final_price = float(offer.counter_price or offer.proposed_price)
        final_qty = float(offer.counter_quantity or offer.proposed_quantity or listing.quantity)
        total = final_price * final_qty

        order = Order(
            listing_id=offer.listing_id,
            buyer_id=offer.buyer_id,
            seller_id=offer.seller_id,
            offer_id=offer.id,
            quantity=final_qty,
            unit=offer.unit or listing.unit.value,
            unit_price_ngn=final_price,
            total_amount_ngn=total,
            status=OrderStatus.created,
        )
        db.add(order)

        notify_user_id = offer.buyer_id if is_seller else offer.seller_id
        event = "offer_accepted"

    elif req.action == "reject":
        if is_buyer and offer.status == OfferStatus.pending:
            raise HTTPException(status_code=400, detail="Buyer cannot reject own pending offer")
        offer.status = OfferStatus.rejected
        offer.resolved_at = now
        notify_user_id = offer.buyer_id if is_seller else offer.seller_id
        event = "offer_rejected"

    elif req.action == "counter":
        if not req.counter_price or req.counter_price <= 0:
            raise HTTPException(status_code=400, detail="Counter price required and must be > 0")
        offer.status = OfferStatus.countered
        offer.counter_price = req.counter_price
        offer.counter_quantity = req.counter_quantity
        offer.counter_message = req.counter_message
        notify_user_id = offer.buyer_id if is_seller else offer.seller_id
        event = "offer_countered"

    elif req.action == "withdraw":
        if not is_buyer:
            raise HTTPException(status_code=403, detail="Only buyer can withdraw an offer")
        offer.status = OfferStatus.withdrawn
        offer.resolved_at = now
        notify_user_id = offer.seller_id
        event = "offer_rejected"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")

    await db.commit()

    # Notify the other party
    notify_result = await db.execute(select(User).where(User.id == notify_user_id))
    notify_user = notify_result.scalar_one_or_none()
    if notify_user:
        background_tasks.add_task(send_offer_notification, offer, event, notify_user)

    return _offer_to_dict(offer)
