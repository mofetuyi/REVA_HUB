"""API routes for 3PL Automated Logistics and Courier Tracking."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.order import Order
from app.models.user import User
from app.services.logistics import (
    calculate_delivery_fee,
    book_courier_dispatch,
    get_tracking_timeline,
)

router = APIRouter(prefix="/logistics", tags=["logistics"])
logger = logging.getLogger("logistics_api")


class QuoteRequest(BaseModel):
    destination_lga: str
    origin_lga: Optional[str] = "Ikeja"
    weight_kg: Optional[float] = 2.0
    is_bulk_tonnage: Optional[bool] = False


@router.post("/quote")
async def get_shipping_quote(req: QuoteRequest):
    """Calculates instantaneous courier and haulage rates for any LGA in Lagos."""
    quote = calculate_delivery_fee(
        destination_lga=req.destination_lga,
        origin_lga=req.origin_lga,
        weight_kg=req.weight_kg or 2.0,
        is_bulk_tonnage=req.is_bulk_tonnage or False,
    )
    return quote


@router.get("/track/{order_id}")
async def track_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the live tracking timeline, courier partner, and status for an order."""
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.buyer_id) != str(current_user.id) and str(order.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to track this order")

    timeline = get_tracking_timeline(order)
    tracking_code = getattr(order, "tracking_code", None) or f"REV-KWIK-{str(order.id)[:6].upper()}"
    tracking_url = getattr(order, "courier_tracking_url", None) or f"https://track.reva-marketplace.com.ng/{tracking_code}"

    return {
        "order_id": str(order.id),
        "tracking_code": tracking_code,
        "courier_provider": getattr(order, "courier_provider", "Kwik Delivery / GIGL Express"),
        "tracking_url": tracking_url,
        "dispatch_status": getattr(order, "dispatch_status", "assigned"),
        "delivery_address": order.buyer_delivery_address,
        "timeline": timeline,
    }


@router.post("/dispatch/{order_id}")
async def dispatch_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seller or platform automated hook to book courier dispatch rider."""
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only seller or admin can dispatch this order")

    dispatch_res = book_courier_dispatch(
        order_id=str(order.id),
        pickup_address=order.seller_pickup_address or "Lagos, Nigeria",
        delivery_address=order.buyer_delivery_address or "Lagos, Nigeria",
        delivery_lga="Lagos",
        buyer_phone=order.buyer_phone or "",
        seller_phone=order.seller_contact_phone or "",
    )

    order.courier_provider = dispatch_res["courier_provider"]
    order.courier_tracking_url = dispatch_res["tracking_url"]
    order.dispatch_status = "assigned"
    await db.commit()

    return {
        "message": "Courier rider booked successfully!",
        "tracking_code": dispatch_res["tracking_code"],
        "courier_provider": dispatch_res["courier_provider"],
        "tracking_url": dispatch_res["tracking_url"],
    }
