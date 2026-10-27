"""SQLAlchemy models – Reva Learn: Tutorial, TutorialSection, SkillPath."""

import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, Numeric, Integer,
    Enum, Text, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MaterialType(str, PyEnum):
    plastic = "plastic"
    fabric = "fabric"
    leather = "leather"
    wood = "wood"
    cardboard = "cardboard"
    clothes = "clothes"
    circular_products = "circular_products"
    multi = "multi"


class Difficulty(str, PyEnum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class TutorialStatus(str, PyEnum):
    draft = "draft"
    pending_review = "pending_review"
    published = "published"
    archived = "archived"


class AuthorType(str, PyEnum):
    staff = "staff"
    admin = "admin"
    tutor = "tutor"


class VideoPlatform(str, PyEnum):
    youtube = "youtube"
    vimeo = "vimeo"


class Tutorial(Base):
    __tablename__ = "tutorials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(350), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(255), nullable=False)  # < 255 chars as spec requires

    material_type = Column(Enum(MaterialType, name="material_type_enum"), nullable=False)
    material_subtypes = Column(JSON, nullable=True)  # list of strings

    difficulty = Column(Enum(Difficulty, name="difficulty_enum"), nullable=False)
    estimated_duration_minutes = Column(Integer, nullable=False, default=30)
    tags = Column(JSON, nullable=True)  # list of strings
    video_url = Column(String(500), nullable=True)  # YouTube, Vimeo, or direct video URL
    materials_needed = Column(JSON, nullable=True)  # List of materials/tools e.g. ["PET Bottles", "Scissor"]

    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    author_type = Column(Enum(AuthorType, name="author_type_enum"), nullable=False, default=AuthorType.staff)

    status = Column(
        Enum(TutorialStatus, name="tutorial_status_enum"),
        nullable=False,
        default=TutorialStatus.draft,
        index=True,
    )

    seasonal_expiry = Column(Date, nullable=True)

    view_count = Column(Integer, default=0, nullable=False)
    rating_average = Column(Numeric(3, 2), default=Decimal("0.00"), nullable=False)
    rating_count = Column(Integer, default=0, nullable=False)

    # Review feedback (from admin to author)
    revision_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    author = relationship("User")
    sections = relationship("TutorialSection", back_populates="tutorial",
                            order_by="TutorialSection.order_index")
    ratings = relationship("TutorialRating", back_populates="tutorial")
    comments = relationship("TutorialComment", back_populates="tutorial",
                            primaryjoin="TutorialComment.tutorial_id == Tutorial.id")
    material_links = relationship("MaterialListingLink", back_populates="tutorial")
    progress_records = relationship("TutorialProgress", back_populates="tutorial")


class TutorialSection(Base):
    __tablename__ = "tutorial_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    section_id = Column(String(100), nullable=False)  # unique within tutorial
    heading = Column(String(255), nullable=False)
    body_markdown = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)

    image_url = Column(String(1000), nullable=True)
    image_alt = Column(String(500), nullable=True)
    image_caption = Column(Text, nullable=True)

    video_platform = Column(Enum(VideoPlatform, name="video_platform_enum"), nullable=True)
    video_id = Column(String(100), nullable=True)
    video_start_time = Column(Integer, nullable=True)  # seconds

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tutorial = relationship("Tutorial", back_populates="sections")


class SkillPath(Base):
    __tablename__ = "skill_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    material_type = Column(Enum(MaterialType, name="skill_path_material_type_enum"), nullable=False)
    difficulty = Column(Enum(Difficulty, name="skill_path_difficulty_enum"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    created_by = relationship("User")
    tutorials = relationship("SkillPathTutorial", back_populates="skill_path",
                             order_by="SkillPathTutorial.sequence")
    progress_records = relationship("SkillPathProgress", back_populates="skill_path")


class SkillPathTutorial(Base):
    __tablename__ = "skill_path_tutorials"
    __table_args__ = (
        UniqueConstraint("skill_path_id", "tutorial_id", name="uq_path_tutorial"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_path_id = Column(UUID(as_uuid=True), ForeignKey("skill_paths.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True, nullable=False)
    has_prerequisite = Column(Boolean, default=False, nullable=False)
    prerequisite_tutorial_id = Column(UUID(as_uuid=True), ForeignKey("tutorials.id"), nullable=True)

    skill_path = relationship("SkillPath", back_populates="tutorials")
    tutorial = relationship("Tutorial", foreign_keys=[tutorial_id])
    prerequisite_tutorial = relationship("Tutorial", foreign_keys=[prerequisite_tutorial_id])
