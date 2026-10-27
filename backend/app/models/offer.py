"""SQLAlchemy models – Offer."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric,
    Enum, Text, ForeignKey, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class OfferStatus(str, PyEnum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    countered = "countered"
    expired = "expired"
    withdrawn = "withdrawn"


class Offer(Base):
    __tablename__ = "offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False, index=True)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    proposed_price = Column(Numeric(15, 2), nullable=False)
    proposed_quantity = Column(Numeric(12, 3), nullable=True)
    unit = Column(String(20), nullable=True)
    message = Column(Text, nullable=True)

    status = Column(
        Enum(OfferStatus, name="offer_status_enum"),
        nullable=False,
        default=OfferStatus.pending,
        index=True,
    )

    # Counter-offer fields
    counter_price = Column(Numeric(15, 2), nullable=True)
    counter_quantity = Column(Numeric(12, 3), nullable=True)
    counter_message = Column(Text, nullable=True)

    # Chain of counter-offers
    parent_offer_id = Column(UUID(as_uuid=True), ForeignKey("offers.id"), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=False)

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
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    listing = relationship("Listing", back_populates="offers")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    parent_offer = relationship("Offer", remote_side="Offer.id", foreign_keys=[parent_offer_id])
    counter_offers = relationship("Offer", foreign_keys=[parent_offer_id])
    order = relationship("Order", back_populates="offer", uselist=False)
