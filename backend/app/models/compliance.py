"""Trust, Safety and Compliance models."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey, Integer,
    Enum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReportTargetType(str, PyEnum):
    listing = "listing"
    user = "user"
    tutorial = "tutorial"
    review = "review"
    order = "order"


class ReportReason(str, PyEnum):
    fraud_scam = "fraud_scam"
    stolen_goods = "stolen_goods"
    prohibited_item = "prohibited_item"
    harassment = "harassment"
    spam = "spam"
    fake_account = "fake_account"
    payment_abuse = "payment_abuse"
    other = "other"


class ReportStatus(str, PyEnum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"
    dismissed = "dismissed"


class EnforcementLevel(str, PyEnum):
    warning = "warning"
    content_removal = "content_removal"
    temporary_restriction = "temporary_restriction"
    suspension = "suspension"
    termination = "termination"
    urgent_protective = "urgent_protective"


class EnforcementStatus(str, PyEnum):
    active = "active"
    appealed = "appealed"
    overturned = "overturned"
    confirmed = "confirmed"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(Enum(ReportTargetType, native_enum=False), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    reason = Column(Enum(ReportReason, native_enum=False), nullable=False)
    description = Column(Text, nullable=False)
    evidence_urls = Column(JSON, nullable=True)

    status = Column(
        Enum(ReportStatus, native_enum=False),
        nullable=False,
        default=ReportStatus.open,
        index=True,
    )
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

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


class EnforcementAction(Base):
    """Records every enforcement action. Levels are guidelines, not a required sequence."""
    __tablename__ = "enforcement_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)

    level = Column(Enum(EnforcementLevel, native_enum=False), nullable=False)
    status = Column(
        Enum(EnforcementStatus, native_enum=False),
        nullable=False,
        default=EnforcementStatus.active,
    )
    reason = Column(Text, nullable=False)
    internal_notes = Column(Text, nullable=True)
    evidence_preserved = Column(Boolean, default=False, nullable=False)

    appeal_text = Column(Text, nullable=True)
    appeal_submitted_at = Column(DateTime(timezone=True), nullable=True)
    appeal_resolved_at = Column(DateTime(timezone=True), nullable=True)
    appeal_resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ModerationLog(Base):
    """Immutable audit log for all moderation and staff decisions."""
    __tablename__ = "moderation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class StaffSetting(Base):
    """Key-value store for staff-managed settings. No secrets stored here."""
    __tablename__ = "staff_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
