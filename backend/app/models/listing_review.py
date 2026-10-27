"""AI Listing Review and Price Reference models."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Text, Numeric, Integer, JSON, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReviewDecision(str, PyEnum):
    approve = "approve"
    needs_review = "needs_review"
    reject = "reject"


class PriceAssessment(str, PyEnum):
    too_low = "too_low"
    fair = "fair"
    too_high = "too_high"
    cannot_judge = "cannot_judge"


class Confidence(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"


class PriceRefStatus(str, PyEnum):
    proposed = "proposed"
    approved = "approved"
    stale = "stale"


class ListingReviewResult(Base):
    """Stores the AI review decision for each listing submission."""
    __tablename__ = "listing_review_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    decision = Column(Enum(ReviewDecision, name="review_decision_enum"), nullable=False)
    reasons = Column(JSON, nullable=True)  # list of strings
    price_assessment = Column(Enum(PriceAssessment, name="price_assessment_enum"), nullable=True)
    suggested_price_range_ngn = Column(JSON, nullable=True)  # {"min": float, "max": float}
    policy_flags = Column(JSON, nullable=True)  # list of strings
    model_used = Column(String(100), nullable=True)
    raw_response = Column(Text, nullable=True)  # stored for audit; truncated
    appeal_text = Column(Text, nullable=True)
    appeal_submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PriceReference(Base):
    """
    Approved price ranges per material/unit for AI listing review.
    IMPORTANT: Table starts empty. Ranges must be admin-approved before use.
    Do not invent prices. Leave table empty until real data is confirmed.
    """
    __tablename__ = "price_references"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(50), nullable=False, index=True)   # e.g. "plastic"
    material = Column(String(100), nullable=False)               # e.g. "PET bottles"
    unit = Column(String(20), nullable=False)                    # kg / piece / bundle
    min_ngn = Column(Numeric(15, 2), nullable=True)
    max_ngn = Column(Numeric(15, 2), nullable=True)
    status = Column(
        Enum(PriceRefStatus, name="price_ref_status_enum"),
        nullable=False,
        default=PriceRefStatus.proposed,
        index=True,
    )
    sources = Column(JSON, nullable=True)       # list of {"url": str, "date": str}
    sample_size = Column(Integer, default=0, nullable=False)
    confidence = Column(Enum(Confidence, name="confidence_enum"), nullable=False, default=Confidence.low)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
