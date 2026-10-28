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
from app.services.payment import create_checkout, calculate_fees, send_seller_payout

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
        metadata_=meta,
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
        "paystack_payment_url": getattr(order, "paystack_payment_url", None) or "https://paystack.shop/pay/13c70vrnsm",
        "delivery_method": getattr(order, "delivery_method", "self_pickup") or "self_pickup",
        "buyer_phone": getattr(order, "buyer_phone", None),
        "buyer_delivery_address": getattr(order, "buyer_delivery_address", None),
        "seller_contact_phone": getattr(order, "seller_contact_phone", None),
        "seller_pickup_address": getattr(order, "seller_pickup_address", None),
        "seller_payout_reference": getattr(order, "seller_payout_reference", None),
        "seller_payout_status": getattr(order, "seller_payout_status", "pending") or "pending",
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


class DirectCheckoutRequest(BaseModel):
    listing_id: str
    quantity: float
    delivery_method: str = "self_pickup"  # self_pickup | own_courier | reva_logistics
    buyer_phone: Optional[str] = None
    buyer_delivery_address: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


@router.post("/checkout", status_code=status.HTTP_201_CREATED)
async def direct_checkout(
    req: DirectCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Direct instant checkout: choose between self-pickup, own courier, or Reva logistics.
    Autofills payment link and creates/funds the order.
    """
    listing_res = await db.execute(select(Listing).where(Listing.id == req.listing_id))
    listing = listing_res.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="Listing is not available for purchase")
    if str(listing.seller_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You cannot buy your own listing")
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

    seller_res = await db.execute(select(User).where(User.id == listing.seller_id))
    seller = seller_res.scalar_one_or_none()

    # Logistics validation
    if req.delivery_method == "reva_logistics":
        if not req.buyer_delivery_address or not (req.buyer_phone or current_user.phone):
            raise HTTPException(
                status_code=400,
                detail="Delivery address and phone number are required for Reva-Hub logistics delivery",
            )

    unit_price = float(listing.price_ngn)
    total_amount = round(unit_price * req.quantity, 2)
    commission = round(total_amount * 0.06, 2)
    seller_proceeds = round(total_amount * 0.94, 2)

    seller_phone = seller.phone if seller else ""
    seller_pickup = listing.pickup_address or f"{listing.lga}, Lagos, Nigeria"
    buyer_phone = req.buyer_phone or current_user.phone or ""
    buyer_address = req.buyer_delivery_address or ""

    order_status = OrderStatus.funded if req.payment_reference else OrderStatus.payment_pending
    ref = req.payment_reference or f"reva_{uuid.uuid4().hex[:12]}"

    order = Order(
        listing_id=listing.id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        quantity=req.quantity,
        unit=listing.unit,
        unit_price_ngn=unit_price,
        total_amount_ngn=total_amount,
        commission_rate=0.06,
        commission_ngn=commission,
        seller_proceeds_ngn=seller_proceeds,
        status=order_status,
        payment_provider="paystack",
        payment_reference=ref,
        delivery_method=req.delivery_method,
        buyer_phone=buyer_phone,
        buyer_delivery_address=buyer_address,
        seller_contact_phone=seller_phone,
        seller_pickup_address=seller_pickup,
        paystack_payment_url="https://paystack.shop/pay/13c70vrnsm",
        collection_notes=req.notes or f"Logistics method: {req.delivery_method}",
    )
    db.add(order)
    await db.flush()

    await _add_event(
        db, order, "order_created", current_user.id,
        f"Order created via {req.delivery_method}. Total: ₦{total_amount:,.2f}"
    )
    if order_status == OrderStatus.funded:
        order.funded_at = datetime.now(timezone.utc)
        await _add_event(db, order, "funded", current_user.id, "Payment confirmed")

    await db.commit()
    await db.refresh(order)

    return _order_to_dict(order)


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

    now = datetime.now(timezone.utc)
    order.delivery_confirmed_at = now
    order.delivery_notes = req.notes
    order.completed_at = now

    total = float(order.total_amount_ngn)
    commission = round(total * 0.06, 2)
    seller_proceeds = round(total * 0.94, 2)
    order.commission_rate = 0.06
    order.commission_ngn = commission
    order.seller_proceeds_ngn = seller_proceeds

    # Fetch seller
    seller_result = await db.execute(select(User).where(User.id == order.seller_id))
    seller = seller_result.scalar_one_or_none()

    # Automatically send 94% of the payment to the seller via Paystack
    payout_result = await send_seller_payout(
        order_id=str(order.id),
        seller_amount_ngn=seller_proceeds,
        seller_email=seller.email or f"{seller.phone}@reva.placeholder" if seller else "seller@reva.placeholder",
        seller_name=seller.name if seller else "Valued Seller",
        seller_phone=seller.phone if seller else None,
    )
    order.seller_payout_reference = payout_result.get("transfer_code") or f"tr_{str(order.id)[:8]}"
    order.seller_payout_status = "released"

    # Transition order status to completed so reviews can be left
    await _transition(
        db, order, OrderStatus.completed, current_user.id,
        f"Buyer confirmed delivery. Paystack automatically sent 94% (₦{seller_proceeds:,.2f}) to seller."
    )

    # Increment completed orders count for seller & check Verified Seller badge
    if seller:
        seller.completed_orders_count = (seller.completed_orders_count or 0) + 1
        if seller.completed_orders_count >= 5 and float(seller.average_rating or 0) >= 4.0:
            seller.is_verified_seller = True
        background_tasks.add_task(send_order_notification, order, "completed", seller)

    await db.commit()

    return {
        "status": "completed",
        "message": f"Delivery confirmed! ₦{seller_proceeds:,.2f} (94%) transferred to seller via Paystack.",
        "seller_proceeds_ngn": seller_proceeds,
        "commission_ngn": commission,
        "order_id": str(order.id),
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
