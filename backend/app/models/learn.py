"""SQLAlchemy models – Progress tracking, Comments, Ratings, Ads, Links."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Integer,
    Enum, Text, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class TutorialProgress(Base):
    __tablename__ = "tutorial_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "tutorial_id", name="uq_progress_user_tutorial"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=False, index=True)

    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_viewed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    sections_viewed = Column(JSON, nullable=True)  # list of section_ids
    progress_percentage = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)

    view_count = Column(Integer, default=1, nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    is_bookmarked = Column(Boolean, default=False, nullable=False)

    # Denormalized from TutorialRating for quick access
    rating = Column(Integer, nullable=True)

    # Placeholder fields for later Premium phase (offline download)
    offline_downloaded = Column(Boolean, default=False, nullable=False)
    offline_downloaded_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="tutorial_progress_records")
    tutorial = relationship("Tutorial", back_populates="progress_records")


class SkillPathProgress(Base):
    __tablename__ = "skill_path_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_path_id", name="uq_path_progress_user_path"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    skill_path_id = Column(UUID(as_uuid=True), ForeignKey("skill_paths.id"), nullable=False, index=True)

    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    progress_percentage = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    tutorials_completed = Column(Integer, default=0, nullable=False)
    last_completed_tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=True)
    badge_awarded = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="skill_path_progress_records")
    skill_path = relationship("SkillPath", back_populates="progress_records")
    last_completed_tutorial = relationship("Tutorial", foreign_keys=[last_completed_tutorial_id])


class CommentModerationStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TutorialComment(Base):
    __tablename__ = "tutorial_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("tutorial_comments.id"), nullable=True)

    body = Column(String(1000), nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    helpful_count = Column(Integer, default=0, nullable=False)

    moderation_status = Column(
        Enum(CommentModerationStatus, name="comment_moderation_status_enum"),
        nullable=False,
        default=CommentModerationStatus.pending,
    )
    has_links = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    tutorial = relationship("Tutorial", back_populates="comments",
                            primaryjoin="TutorialComment.tutorial_id == Tutorial.id")
    author = relationship("User")
    parent = relationship("TutorialComment", remote_side="TutorialComment.id",
                          foreign_keys=[parent_id])
    replies = relationship("TutorialComment", foreign_keys=[parent_id])


class TutorialRating(Base):
    __tablename__ = "tutorial_ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "tutorial_id", name="uq_rating_user_tutorial"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    rating = Column(Integer, nullable=False)  # 1–5
    feedback = Column(Text, nullable=True)
    helpful_for = Column(String(255), nullable=True)  # optional audience selection

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tutorial = relationship("Tutorial", back_populates="ratings")
    user = relationship("User")


class AdCreativeType(str, PyEnum):
    video = "video"
    banner = "banner"
    inline = "inline"


class AdPlacementType(str, PyEnum):
    pre_tutorial = "pre_tutorial"
    banner = "banner"
    inline = "inline"


class AdStatus(str, PyEnum):
    active = "active"
    paused = "paused"
    ended = "ended"


class AdPlacement(Base):
    __tablename__ = "ad_placements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advertiser_name = Column(String(255), nullable=False)
    creative_type = Column(Enum(AdCreativeType, name="ad_creative_type_enum"), nullable=False)
    creative_url = Column(String(1000), nullable=False)
    call_to_action = Column(String(255), nullable=True)

    schedule_start = Column(DateTime(timezone=True), nullable=False)
    schedule_end = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(AdStatus, name="ad_status_enum"), nullable=False, default=AdStatus.active)

    placement_type = Column(Enum(AdPlacementType, name="ad_placement_type_enum"), nullable=False)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=True)  # null = all tutorials
    skip_after_seconds = Column(Integer, nullable=True)  # for video ads

    # Planning assumptions only; actual rates TBD
    cpm_rate_ngn = Column(Numeric(10, 2), nullable=True)
    cpc_rate_ngn = Column(Numeric(10, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    impressions = relationship("AdImpression", back_populates="placement")


class AdImpression(Base):
    __tablename__ = "ad_impressions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    placement_id = Column(UUID(as_uuid=True), ForeignKey("ad_placements.id"), nullable=False, index=True)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    is_premium_user = Column(Boolean, default=False, nullable=False)
    was_skipped = Column(Boolean, nullable=True)
    view_duration_seconds = Column(Integer, nullable=True)
    was_clicked = Column(Boolean, default=False, nullable=False)
    clicked_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    placement = relationship("AdPlacement", back_populates="impressions")


class RelevanceType(str, PyEnum):
    exact_match = "exact_match"
    similar = "similar"
    alternative = "alternative"


class MaterialListingLink(Base):
    """Links a Reva Learn tutorial to relevant marketplace listings."""
    __tablename__ = "material_listing_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=False, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False, index=True)
    context_section = Column(String(100), nullable=True)
    relevance = Column(Enum(RelevanceType, name="relevance_type_enum"), nullable=False,
                       default=RelevanceType.similar)
    click_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tutorial = relationship("Tutorial", back_populates="material_links")
    listing = relationship("Listing", back_populates="material_links")


class TutorInteractiveSession(Base):
    """Premium-exclusive interactive session / Q&A thread with the creator of a tutor video."""
    __tablename__ = "tutor_interactive_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    session_type = Column(String(50), default="qa_priority", nullable=False)  # qa_priority, critique, one_on_one_call
    status = Column(String(50), default="pending", nullable=False)  # pending, answered, completed
    timestamp_seconds = Column(Integer, nullable=True)  # Video second reference e.g. 145 (2:25)
    question_title = Column(String(255), nullable=False)
    details = Column(Text, nullable=False)
    student_project_url = Column(String(500), nullable=True)
    preferred_date = Column(String(100), nullable=True)

    tutor_reply = Column(Text, nullable=True)
    meeting_link = Column(String(500), nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    tutorial = relationship("Tutorial")
    student = relationship("User", foreign_keys=[student_id])
    tutor = relationship("User", foreign_keys=[tutor_id])

