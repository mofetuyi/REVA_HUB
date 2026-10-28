"""SQLAlchemy models – Listing and ListingPhoto."""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Integer,
    Enum, Text, ForeignKey, Float
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ListingCategory(str, PyEnum):
    plastic = "plastic"
    fabric = "fabric"
    leather = "leather"
    wood = "wood"
    cardboard = "cardboard"
    clothes = "clothes"
    circular_products = "circular_products"
    other = "other"


class ListingUnit(str, PyEnum):
    kg = "kg"
    tonnes = "tonnes"
    bags = "bags"
    pieces = "pieces"
    bundles = "bundles"
    litres = "litres"


class ListingCondition(str, PyEnum):
    new = "new"
    like_new = "like_new"
    used = "used"
    mixed = "mixed"


class CollectionMethod(str, PyEnum):
    buyer_arranges = "buyer_arranges"
    seller_arranges = "seller_arranges"
    either = "either"


class ListingStatus(str, PyEnum):
    active = "active"
    expired = "expired"
    delisted = "delisted"
    sold = "sold"


class ModerationStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    slug = Column(String(300), unique=True, nullable=False, index=True)

    category = Column(Enum(ListingCategory, native_enum=False), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    quantity = Column(Numeric(12, 3), nullable=False)
    unit = Column(Enum(ListingUnit, native_enum=False), nullable=False)

    condition = Column(Enum(ListingCondition, native_enum=False), nullable=False)
    condition_notes = Column(Text, nullable=True)

    price_ngn = Column(Numeric(15, 2), nullable=False)

    # Location
    lga = Column(String(100), nullable=False)
    pickup_address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    collection_method = Column(
        Enum(CollectionMethod, native_enum=False),
        nullable=False,
        default=CollectionMethod.buyer_arranges,
    )

    # Status and moderation
    status = Column(
        Enum(ListingStatus, native_enum=False),
        nullable=False,
        default=ListingStatus.active,
        index=True,
    )
    moderation_status = Column(
        Enum(ModerationStatus, native_enum=False),
        nullable=False,
        default=ModerationStatus.pending,
    )
    moderation_notes = Column(Text, nullable=True)

    # Stats
    view_count = Column(Integer, default=0, nullable=False)

    # Flagging
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_count = Column(Integer, default=0, nullable=False)
    flagged_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    listed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
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

    # Relationships
    seller = relationship("User", back_populates="listings", foreign_keys=[seller_id])
    photos = relationship("ListingPhoto", back_populates="listing", order_by="ListingPhoto.order_index")
    offers = relationship("Offer", back_populates="listing")
    orders = relationship("Order", back_populates="listing")
    material_links = relationship("MaterialListingLink", back_populates="listing")


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(1000), nullable=False)
    storage_key = Column(String(500), nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    listing = relationship("Listing", back_populates="photos")
