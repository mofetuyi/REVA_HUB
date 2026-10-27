"""SQLAlchemy models – Review."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer,
    Enum, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReviewType(str, PyEnum):
    buyer_reviews_seller = "buyer_reviews_seller"
    seller_reviews_buyer = "seller_reviews_buyer"


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("reviewer_id", "order_id", name="uq_review_reviewer_order"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    reviewee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    rating = Column(Integer, nullable=False)  # 1–5
    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=True)

    is_verified_purchase = Column(Boolean, default=True, nullable=False)
    review_type = Column(Enum(ReviewType, name="review_type_enum"), nullable=False)
    # Seller reviews are public; buyer reviews remain internal
    is_public = Column(Boolean, default=False, nullable=False)

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

    order = relationship("Order", back_populates="review_given", foreign_keys=[order_id])
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    reviewee = relationship("User", back_populates="reviews_received", foreign_keys=[reviewee_id])
