"""SQLAlchemy models – Order and OrderEvent."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Integer,
    Enum, Text, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class OrderStatus(str, PyEnum):
    created = "created"
    payment_pending = "payment_pending"
    funded = "funded"
    in_transit = "in_transit"
    delivered = "delivered"
    confirmed = "confirmed"
    released = "released"
    disputed = "disputed"
    refunded = "refunded"
    completed = "completed"
    cancelled = "cancelled"


class CollectionArranger(str, PyEnum):
    buyer = "buyer"
    seller = "seller"
    tbd = "tbd"


# Valid state transitions – enforced in service layer
VALID_ORDER_TRANSITIONS = {
    OrderStatus.created: {OrderStatus.payment_pending, OrderStatus.funded, OrderStatus.cancelled},
    OrderStatus.payment_pending: {OrderStatus.funded, OrderStatus.cancelled},
    OrderStatus.funded: {OrderStatus.in_transit, OrderStatus.delivered, OrderStatus.confirmed, OrderStatus.completed, OrderStatus.disputed, OrderStatus.cancelled},
    OrderStatus.in_transit: {OrderStatus.delivered, OrderStatus.confirmed, OrderStatus.completed, OrderStatus.disputed},
    OrderStatus.delivered: {OrderStatus.confirmed, OrderStatus.completed, OrderStatus.disputed},
    OrderStatus.confirmed: {OrderStatus.released, OrderStatus.completed},
    OrderStatus.released: {OrderStatus.completed},
    OrderStatus.disputed: {OrderStatus.refunded, OrderStatus.released, OrderStatus.completed},
    OrderStatus.refunded: set(),
    OrderStatus.completed: set(),
    OrderStatus.cancelled: set(),
}


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False, index=True)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    offer_id = Column(UUID(as_uuid=True), ForeignKey("offers.id"), nullable=True)

    # Agreed terms
    quantity = Column(Numeric(12, 3), nullable=False)
    unit = Column(String(20), nullable=False)
    unit_price_ngn = Column(Numeric(15, 2), nullable=False)
    total_amount_ngn = Column(Numeric(15, 2), nullable=False)

    # Fee breakdown (calculated on release, stored for audit)
    commission_rate = Column(Numeric(5, 4), nullable=True)
    commission_ngn = Column(Numeric(15, 2), nullable=True)
    processing_fee_ngn = Column(Numeric(15, 2), nullable=True)
    seller_proceeds_ngn = Column(Numeric(15, 2), nullable=True)

    # Payment
    payment_provider = Column(String(50), nullable=True)
    payment_reference = Column(String(255), nullable=True, unique=True)
    escrow_reference = Column(String(255), nullable=True)

    status = Column(
        Enum(OrderStatus, native_enum=False),
        nullable=False,
        default=OrderStatus.created,
        index=True,
    )

    # Collection/delivery
    delivery_method = Column(String(50), nullable=True, default="self_pickup")
    buyer_phone = Column(String(50), nullable=True)
    buyer_delivery_address = Column(String(500), nullable=True)
    seller_contact_phone = Column(String(50), nullable=True)
    seller_pickup_address = Column(String(500), nullable=True)
    paystack_payment_url = Column(String(500), nullable=True)
    seller_payout_reference = Column(String(255), nullable=True)
    seller_payout_status = Column(String(50), nullable=True, default="pending")

    collection_arranged_by = Column(
        Enum(CollectionArranger, native_enum=False),
        nullable=True,
        default=CollectionArranger.tbd,
    )
    collection_notes = Column(Text, nullable=True)
    delivery_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    delivery_notes = Column(Text, nullable=True)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Escrow auto-release
    # OPEN DECISION: trigger is provisional — see .env.example for conflict note
    auto_release_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    funded_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    listing = relationship("Listing", back_populates="orders")
    buyer = relationship("User", back_populates="orders_as_buyer", foreign_keys=[buyer_id])
    seller = relationship("User", back_populates="orders_as_seller", foreign_keys=[seller_id])
    offer = relationship("Offer", back_populates="order")
    events = relationship("OrderEvent", back_populates="order", order_by="OrderEvent.created_at")
    dispute = relationship("Dispute", back_populates="order", uselist=False)
    review_given = relationship("Review", back_populates="order", foreign_keys="Review.order_id")


class OrderEvent(Base):
    __tablename__ = "order_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    order = relationship("Order", back_populates="events")
    actor = relationship("User")

    def __init__(self, **kwargs):
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        super().__init__(**kwargs)
