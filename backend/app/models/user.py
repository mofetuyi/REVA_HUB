"""SQLAlchemy models – User."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Integer,
    Enum, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class AccountType(str, PyEnum):
    individual = "individual"
    business = "business"


class UserMode(str, PyEnum):
    buyer = "buyer"
    seller = "seller"


class KYCStatus(str, PyEnum):
    not_started = "not_started"
    in_progress = "in_progress"
    verified = "verified"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(50), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)

    # Account type
    account_type = Column(
        Enum(AccountType, name="account_type_enum"),
        nullable=False,
        default=AccountType.individual,
    )
    business_name = Column(String(255), nullable=True)
    cac_number = Column(String(100), nullable=True)

    # Location
    state = Column(String(100), nullable=False, default="Lagos")
    lga = Column(String(100), nullable=False, default="Lagos Island")

    # Verification status
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)

    # KYC
    kyc_status = Column(
        Enum(KYCStatus, name="kyc_status_enum"),
        nullable=False,
        default=KYCStatus.not_started,
    )
    # Provider reference stored; encrypt at rest in production
    kyc_provider_ref = Column(String(500), nullable=True)
    kyc_started_at = Column(DateTime(timezone=True), nullable=True)
    kyc_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Mode and roles
    current_mode = Column(
        Enum(UserMode, name="user_mode_enum"),
        nullable=False,
        default=UserMode.buyer,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_buyer = Column(Boolean, default=True, nullable=False)
    is_seller = Column(Boolean, default=False, nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Profile
    avatar_url = Column(String(500), nullable=True)

    # Reputation (denormalized for performance)
    completed_orders_count = Column(Integer, default=0, nullable=False)
    average_rating = Column(Numeric(3, 2), default=Decimal("0.00"), nullable=False)
    review_count = Column(Integer, default=0, nullable=False)

    # Verified seller badge
    # OPEN DECISION: Whether badge affects search ranking — NOT applied by default
    is_verified_seller = Column(Boolean, default=False, nullable=False)
    verified_seller_since = Column(DateTime(timezone=True), nullable=True)

    # Reva ID — stable public identifier, format: "REVA-" + str(id).upper()
    # Generated at signup; existing users receive it on first /auth/me call
    reva_id = Column(String(50), unique=True, nullable=True, index=True)

    # Reva Premium
    is_premium = Column(Boolean, default=False, nullable=False)
    premium_activated_at = Column(DateTime(timezone=True), nullable=True)
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    premium_payment_reference = Column(String(255), nullable=True)

    # Reva Learn Tutor Mode & Creator Monetization (Available to all registered accounts with permission)
    is_tutor = Column(Boolean, default=False, nullable=False)
    tutor_status = Column(String(50), default="none", nullable=False)  # "none", "pending", "approved", "rejected"
    tutor_specialty = Column(String(255), nullable=True)  # e.g. "Plastic Upcycling & DIY Planters"
    tutor_applied_at = Column(DateTime(timezone=True), nullable=True)
    tutor_approved_at = Column(DateTime(timezone=True), nullable=True)
    tutor_earnings_naira = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Compliance / policy acceptance
    policy_version_accepted = Column(String(20), nullable=True)   # e.g. "1.0"
    policy_accepted_at = Column(DateTime(timezone=True), nullable=True)

    # Account restriction (Trust & Safety)
    is_restricted = Column(Boolean, default=False, nullable=False)
    restriction_reason = Column(Text, nullable=True)
    restricted_at = Column(DateTime(timezone=True), nullable=True)
    restricted_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

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
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    listings = relationship("Listing", back_populates="seller", foreign_keys="Listing.seller_id")
    orders_as_buyer = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    orders_as_seller = relationship("Order", back_populates="seller", foreign_keys="Order.seller_id")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
    tutorial_progress_records = relationship("TutorialProgress", back_populates="user")
    skill_path_progress_records = relationship("SkillPathProgress", back_populates="user")
