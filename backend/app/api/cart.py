"""API routes for Multi-Item Shopping Cart and Consolidated Escrow Checkout."""

import logging
import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.listing import Listing
from app.models.order import Order, OrderStatus, OrderEvent
from app.models.user import User
from app.services.logistics import calculate_delivery_fee, book_courier_dispatch
from app.services.payment import create_checkout

router = APIRouter(prefix="/cart", tags=["cart"])
logger = logging.getLogger("cart_api")


class CartItemInput(BaseModel):
    listing_id: str
    quantity: float = Field(..., gt=0)


class CartCheckoutRequest(BaseModel):
    items: List[CartItemInput] = Field(..., min_length=1)
    buyer_phone: Optional[str] = None
    buyer_delivery_address: str = Field(..., min_length=5)
    buyer_delivery_lga: str = Field(..., min_length=2)
    notes: Optional[str] = None


@router.post("/checkout", status_code=status.HTTP_201_CREATED)
async def checkout_cart(
    req: CartCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Processes a multi-item cart checkout.
    
    1. Validates all inventory and listings.
    2. Calculates Lagos zone courier delivery fee and Paystack escrow processing.
    3. Groups items into sub-orders under a single cart_group_id and payment_reference.
    4. Automatically schedules courier dispatch and returns consolidated Paystack link.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    cart_group_id = f"cart_{uuid.uuid4().hex[:10]}"
    payment_ref = f"reva_cart_{uuid.uuid4().hex[:12]}"
    buyer_phone = req.buyer_phone or current_user.phone or ""
    
    validated_items = []
    items_subtotal = Decimal("0.00")
    total_weight = 0.0
    has_bulk_tonnage = False

    for item_input in req.items:
        lst_res = await db.execute(select(Listing).where(Listing.id == item_input.listing_id))
        listing = lst_res.scalar_one_or_none()
        if not listing:
            raise HTTPException(status_code=404, detail=f"Listing {item_input.listing_id} not found")
        if listing.status != "active":
            raise HTTPException(status_code=400, detail=f"Listing '{listing.title}' is no longer active")
        if str(listing.seller_id) == str(current_user.id):
            raise HTTPException(status_code=400, detail=f"You cannot buy your own item: '{listing.title}'")

        qty = Decimal(str(item_input.quantity))
        unit_price = Decimal(str(listing.price_ngn))
        item_total = unit_price * qty
        items_subtotal += item_total

        # Check unit for tonnage
        if str(listing.unit).lower() in ("tonnes", "tons", "tonne"):
            has_bulk_tonnage = True
            total_weight += float(qty) * 1000
        elif str(listing.unit).lower() == "kg":
            total_weight += float(qty)
        else:
            total_weight += float(qty) * 2.0  # standard pieces weight assumption

        validated_items.append({
            "listing": listing,
            "quantity": qty,
            "unit_price": unit_price,
            "item_total": item_total,
        })

    # Logistics fee calculation
    logistics_quote = calculate_delivery_fee(
        destination_lga=req.buyer_delivery_lga,
        origin_lga="Ikeja",
        weight_kg=total_weight,
        is_bulk_tonnage=has_bulk_tonnage,
    )
    delivery_fee = Decimal(str(logistics_quote["delivery_fee_ngn"]))
    courier_name = logistics_quote["courier"]

    # Book automated courier dispatch
    dispatch_booking = book_courier_dispatch(
        order_id=cart_group_id,
        pickup_address="Lagos Multi-Vendor Pickup Hub",
        delivery_address=req.buyer_delivery_address,
        delivery_lga=req.buyer_delivery_lga,
        buyer_phone=buyer_phone,
        seller_phone="+2347076630396",
        courier_provider=courier_name,
    )

    per_item_delivery_fee = round(delivery_fee / Decimal(str(len(validated_items))), 2)
    created_orders = []

    for v in validated_items:
        lst = v["listing"]
        item_sub = v["item_total"]
        commission = round(item_sub * Decimal("0.06"), 2)
        seller_proceeds = round(item_sub * Decimal("0.94"), 2)

        seller_res = await db.execute(select(User).where(User.id == lst.seller_id))
        seller = seller_res.scalar_one_or_none()
        seller_phone = seller.phone if seller else ""
        seller_pickup = lst.pickup_address or f"{lst.lga}, Lagos, Nigeria"

        order = Order(
            listing_id=lst.id,
            buyer_id=current_user.id,
            seller_id=lst.seller_id,
            quantity=float(v["quantity"]),
            unit=lst.unit,
            unit_price_ngn=float(v["unit_price"]),
            total_amount_ngn=float(item_sub),
            commission_rate=0.06,
            commission_ngn=float(commission),
            seller_proceeds_ngn=float(seller_proceeds),
            status=OrderStatus.payment_pending,
            payment_provider="paystack",
            payment_reference=payment_ref,
            delivery_method="delivery",
            buyer_phone=buyer_phone,
            buyer_delivery_address=req.buyer_delivery_address,
            seller_contact_phone=seller_phone,
            seller_pickup_address=seller_pickup,
            paystack_payment_url="https://paystack.shop/pay/13c70vrnsm",
            cart_group_id=cart_group_id,
            courier_provider=courier_name,
            courier_tracking_url=dispatch_booking["tracking_url"],
            delivery_fee_ngn=float(per_item_delivery_fee),
            dispatch_status="assigned",
            collection_notes=req.notes or f"Multi-item order dispatched via {courier_name} to {req.buyer_delivery_lga}",
        )
        db.add(order)
        await db.flush()

        event = OrderEvent(
            order_id=order.id,
            event_type="order_created",
            actor_id=current_user.id,
            description=f"Multi-item cart order placed. 3PL Courier: {courier_name}",
        )
        db.add(event)
        created_orders.append(str(order.id))

    await db.commit()

    total_charge_ngn = float(items_subtotal + delivery_fee)

    # Initialize live Paystack session if configured
    email = current_user.email or f"{current_user.phone}@reva.placeholder"
    checkout_url = "https://paystack.shop/pay/13c70vrnsm"
    if settings.payment_configured:
        try:
            paystack_res = await create_checkout(
                order_id=cart_group_id,
                amount_ngn=total_charge_ngn,
                customer_email=email,
                callback_url=f"{settings.FRONTEND_URL}/orders?cart_group={cart_group_id}",
            )
            checkout_url = paystack_res["checkout_url"]
        except Exception as e:
            logger.warning("Could not initialize dynamic Paystack checkout: %s; using standard link", e)

    return {
        "success": True,
        "message": f"Successfully placed order for {len(created_orders)} items with consolidated escrow payment!",
        "cart_group_id": cart_group_id,
        "payment_reference": payment_ref,
        "order_ids": created_orders,
        "items_count": len(created_orders),
        "items_subtotal_ngn": float(items_subtotal),
        "delivery_fee_ngn": float(delivery_fee),
        "total_amount_ngn": total_charge_ngn,
        "courier_provider": courier_name,
        "tracking_code": dispatch_booking["tracking_code"],
        "tracking_url": dispatch_booking["tracking_url"],
        "checkout_url": checkout_url,
    }
