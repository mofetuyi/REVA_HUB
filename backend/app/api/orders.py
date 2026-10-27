"""Orders API routes."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.order import Order, OrderEvent, OrderStatus, CollectionArranger, VALID_ORDER_TRANSITIONS
from app.models.dispute import Dispute, DisputeReason, DisputeStatus
from app.models.listing import Listing
from app.models.user import User
from app.services.email import send_order_notification, send_dispute_notification
from app.services.payment import create_checkout, calculate_fees

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)


class CollectionUpdate(BaseModel):
    arranged_by: CollectionArranger
    notes: Optional[str] = None


class DeliveryConfirm(BaseModel):
    notes: Optional[str] = None


class DisputeCreate(BaseModel):
    reason: DisputeReason
    description: str


async def _add_event(db: AsyncSession, order: Order, event_type: str, actor_id, description: str, meta=None):
    event = OrderEvent(
        order_id=order.id,
        event_type=event_type,
        actor_id=actor_id,
        description=description,
        metadata=meta,
    )
    db.add(event)


async def _transition(db: AsyncSession, order: Order, new_status: OrderStatus, actor_id, description: str):
    allowed = VALID_ORDER_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition order from {order.status.value} to {new_status.value}",
        )
    order.status = new_status
    await _add_event(db, order, new_status.value, actor_id, description)


def _order_to_dict(order: Order) -> dict:
    return {
        "id": str(order.id),
        "listing_id": str(order.listing_id),
        "buyer_id": str(order.buyer_id),
        "seller_id": str(order.seller_id),
        "offer_id": str(order.offer_id) if order.offer_id else None,
        "quantity": float(order.quantity),
        "unit": order.unit,
        "unit_price_ngn": float(order.unit_price_ngn),
        "total_amount_ngn": float(order.total_amount_ngn),
        "commission_rate": float(order.commission_rate or 0),
        "commission_ngn": float(order.commission_ngn or 0),
        "processing_fee_ngn": float(order.processing_fee_ngn or 0),
        "seller_proceeds_ngn": float(order.seller_proceeds_ngn or 0),
        "payment_provider": order.payment_provider,
        "payment_reference": order.payment_reference,
        "status": order.status.value,
        "collection_arranged_by": order.collection_arranged_by.value if order.collection_arranged_by else None,
        "collection_notes": order.collection_notes,
        "delivery_confirmed_at": order.delivery_confirmed_at.isoformat() if order.delivery_confirmed_at else None,
        "delivery_notes": order.delivery_notes,
        "auto_release_at": order.auto_release_at.isoformat() if order.auto_release_at else None,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "funded_at": order.funded_at.isoformat() if order.funded_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "events": [
            {
                "event_type": e.event_type,
                "description": e.description,
                "created_at": e.created_at.isoformat(),
            }
            for e in (order.events or [])
        ],
    }


@router.get("")
async def list_orders(
    role: Optional[str] = None,  # "buyer" or "seller"
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [or_(Order.buyer_id == current_user.id, Order.seller_id == current_user.id)]
    if role == "buyer":
        filters = [Order.buyer_id == current_user.id]
    elif role == "seller":
        filters = [Order.seller_id == current_user.id]
    if status_filter:
        try:
            filters.append(Order.status == OrderStatus(status_filter))
        except ValueError:
            pass

    q = await db.execute(
        select(Order).where(*filters).order_by(Order.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    orders = q.scalars().all()
    return [_order_to_dict(o) for o in orders]


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id) and str(order.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _order_to_dict(order)


@router.post("/{order_id}/initiate-payment")
async def initiate_payment(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buyer initiates payment – creates Paystack checkout session."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only buyer can initiate payment")
    if order.status not in (OrderStatus.created, OrderStatus.payment_pending):
        raise HTTPException(status_code=400, detail=f"Order status {order.status.value} cannot be paid")

    callback_url = f"{settings.FRONTEND_URL}/orders/{order_id}?payment=callback"

    email = current_user.email or f"{current_user.phone}@reva.placeholder"
    try:
        checkout_data = await create_checkout(
            order_id=order_id,
            amount_ngn=float(order.total_amount_ngn),
            customer_email=email,
            callback_url=callback_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    order.payment_reference = checkout_data["reference"]
    order.payment_provider = settings.PAYMENT_PROVIDER
    await _transition(db, order, OrderStatus.payment_pending, current_user.id, "Payment initiated")
    await db.commit()

    fees = calculate_fees(float(order.total_amount_ngn))

    return {
        "checkout_url": checkout_data["checkout_url"],
        "reference": checkout_data["reference"],
        "configured": checkout_data.get("configured", False),
        "fee_breakdown": fees,
    }


@router.put("/{order_id}/collection")
async def update_collection(
    order_id: str,
    req: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id) and str(order.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if order.status not in (OrderStatus.funded, OrderStatus.in_transit):
        raise HTTPException(status_code=400, detail="Order is not in a state for collection updates")

    order.collection_arranged_by = req.arranged_by
    order.collection_notes = req.notes
    await _add_event(db, order, "collection_updated", current_user.id,
                     f"Collection arranged by: {req.arranged_by.value}")
    await db.commit()
    return {"message": "Collection details updated"}


@router.put("/{order_id}/in-transit")
async def mark_in_transit(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only seller can mark as in-transit")

    await _transition(db, order, OrderStatus.in_transit, current_user.id, "Seller marked order in transit")
    await db.commit()
    return {"message": "Order marked in transit"}


@router.post("/{order_id}/confirm-delivery")
async def confirm_delivery(
    order_id: str,
    req: DeliveryConfirm,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only buyer can confirm delivery")

    await _transition(db, order, OrderStatus.confirmed, current_user.id, "Buyer confirmed delivery")
    now = datetime.now(timezone.utc)
    order.delivery_confirmed_at = now
    order.delivery_notes = req.notes

    # Set provisional auto-release date
    # OPEN DECISION: provisional 14 days after confirmation
    # ESCROW_AUTO_RELEASE_ENABLED must remain False until approved
    order.auto_release_at = now + timedelta(days=settings.ESCROW_RELEASE_DAYS_AFTER_CONFIRM)

    await db.commit()

    # Notify seller
    seller_result = await db.execute(select(User).where(User.id == order.seller_id))
    seller = seller_result.scalar_one_or_none()
    if seller:
        background_tasks.add_task(send_order_notification, order, "confirmed", seller)

    return {
        "message": "Delivery confirmed",
        "auto_release_at": order.auto_release_at.isoformat(),
        "note": "Escrow auto-release is provisional and requires admin approval to activate.",
    }


@router.post("/{order_id}/dispute")
async def raise_dispute(
    order_id: str,
    req: DisputeCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id) and str(order.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if order.status not in (OrderStatus.funded, OrderStatus.in_transit, OrderStatus.delivered, OrderStatus.confirmed):
        raise HTTPException(status_code=400, detail=f"Cannot dispute order in status: {order.status.value}")

    # Check no existing open dispute
    existing = await db.execute(select(Dispute).where(Dispute.order_id == order.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A dispute already exists for this order")

    if not req.description or len(req.description) < 20:
        raise HTTPException(status_code=400, detail="Please provide a detailed description (min 20 chars)")

    now = datetime.now(timezone.utc)
    dispute = Dispute(
        order_id=order.id,
        raised_by_id=current_user.id,
        reason=req.reason,
        description=req.description,
        status=DisputeStatus.open,
        sla_deadline=now + timedelta(days=5),  # 5-day SLA
    )
    db.add(dispute)

    await _transition(db, order, OrderStatus.disputed, current_user.id, f"Dispute raised: {req.reason.value}")
    await db.commit()

    # Notify the other party
    other_id = order.seller_id if str(order.buyer_id) == str(current_user.id) else order.buyer_id
    other_result = await db.execute(select(User).where(User.id == other_id))
    other = other_result.scalar_one_or_none()
    if other:
        background_tasks.add_task(send_dispute_notification, dispute, other)

    return {"message": "Dispute raised", "dispute_id": str(dispute.id)}
