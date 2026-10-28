"""SQLAlchemy models – Dispute and DisputeEvidence."""

import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric,
    Enum, Text, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class DisputeReason(str, PyEnum):
    condition_not_as_described = "condition_not_as_described"
    quantity_mismatch = "quantity_mismatch"
    delivery_not_received = "delivery_not_received"
    damaged_in_transit = "damaged_in_transit"
    other = "other"


class DisputeStatus(str, PyEnum):
    open = "open"
    under_review = "under_review"
    resolved_refund = "resolved_refund"
    resolved_release = "resolved_release"
    escalated = "escalated"
    closed = "closed"


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    raised_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    reason = Column(Enum(DisputeReason, native_enum=False), nullable=False)
    description = Column(Text, nullable=False)

    status = Column(
        Enum(DisputeStatus, native_enum=False),
        nullable=False,
        default=DisputeStatus.open,
        index=True,
    )

    resolution = Column(String(50), nullable=True)  # "refund" or "release"
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    escalated_at = Column(DateTime(timezone=True), nullable=True)
    # SLA: 5-day response deadline from creation
    sla_deadline = Column(DateTime(timezone=True), nullable=False)

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

    order = relationship("Order", back_populates="dispute")
    raised_by = relationship("User", foreign_keys=[raised_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    evidence = relationship("DisputeEvidence", back_populates="dispute")


class DisputeEvidence(Base):
    __tablename__ = "dispute_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispute_id = Column(UUID(as_uuid=True), ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_url = Column(String(1000), nullable=False)
    file_type = Column(String(50), nullable=True)  # photo, message, document
    description = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    dispute = relationship("Dispute", back_populates="evidence")
    uploaded_by = relationship("User")
