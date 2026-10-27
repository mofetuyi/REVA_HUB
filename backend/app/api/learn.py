"""Reva Learn API routes."""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, field_validator
from slugify import slugify

from app.core.database import get_db
from app.core.deps import get_current_user, require_staff, get_optional_user
from app.models.tutorial import (
    Tutorial, TutorialSection, SkillPath, SkillPathTutorial,
    TutorialStatus, MaterialType, Difficulty, AuthorType
)
from app.models.learn import (
    TutorialProgress, SkillPathProgress, TutorialComment, TutorialRating,
    AdPlacement, AdImpression, MaterialListingLink,
    CommentModerationStatus, AdStatus, TutorInteractiveSession
)
from app.models.listing import Listing, ListingStatus, ModerationStatus
from app.models.user import User

router = APIRouter(prefix="/learn", tags=["learn"])
logger = logging.getLogger(__name__)


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SectionCreate(BaseModel):
    section_id: str
    heading: str
    body_markdown: str
    order_index: int
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    image_caption: Optional[str] = None
    video_platform: Optional[str] = None
    video_id: Optional[str] = None
    video_start_time: Optional[int] = None


class TutorialCreate(BaseModel):
    title: str
    description: str
    material_type: MaterialType
    material_subtypes: Optional[List[str]] = None
    difficulty: Difficulty
    estimated_duration_minutes: int = 30
    video_url: Optional[str] = None
    materials_needed: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    sections: List[SectionCreate] = []

    @field_validator("description")
    @classmethod
    def desc_length(cls, v: str) -> str:
        if len(v) > 254:
            raise ValueError("Description must be shorter than 255 characters")
        return v


class TutorUploadRequest(BaseModel):
    title: str
    description: str
    material_type: MaterialType
    difficulty: Difficulty = Difficulty.beginner
    estimated_duration_minutes: int = 25
    video_url: Optional[str] = None
    materials_needed: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    content_markdown: Optional[str] = None


class TutorApplyRequest(BaseModel):
    specialty: Optional[str] = None
    experience: Optional[str] = None


class InteractiveSessionCreate(BaseModel):
    session_type: str = "qa_priority"  # 'qa_priority' | 'critique' | 'one_on_one_call'
    question_title: str
    details: str
    timestamp_seconds: Optional[int] = None
    student_project_url: Optional[str] = None
    preferred_date: Optional[str] = None


class InteractiveSessionReply(BaseModel):
    reply: str
    meeting_link: Optional[str] = None
    status: str = "answered"


class TutorialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    estimated_duration_minutes: Optional[int] = None
    tags: Optional[List[str]] = None
    sections: Optional[List[SectionCreate]] = None


class SkillPathCreate(BaseModel):
    title: str
    description: str
    material_type: MaterialType
    difficulty: Difficulty
    tutorial_ids: List[str] = []


class CommentCreate(BaseModel):
    body: str
    parent_id: Optional[str] = None

    @field_validator("body")
    @classmethod
    def body_length(cls, v: str) -> str:
        if len(v) > 1000:
            raise ValueError("Comment must be 1000 characters or fewer")
        return v


class RatingCreate(BaseModel):
    rating: int
    feedback: Optional[str] = None
    helpful_for: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class SectionProgress(BaseModel):
    section_id: str
    time_spent_seconds: int = 0


# ── Helpers ──────────────────────────────────────────────────────────────────

def _tutorial_to_dict(tutorial: Tutorial, include_sections: bool = False) -> dict:
    d = {
        "id": str(tutorial.id),
        "slug": tutorial.slug,
        "title": tutorial.title,
        "description": tutorial.description,
        "material_type": tutorial.material_type.value,
        "material_subtypes": tutorial.material_subtypes,
        "difficulty": tutorial.difficulty.value,
        "estimated_duration_minutes": tutorial.estimated_duration_minutes,
        "tags": tutorial.tags,
        "author_id": str(tutorial.author_id),
        "status": tutorial.status.value,
        "video_url": getattr(tutorial, "video_url", None),
        "materials_needed": getattr(tutorial, "materials_needed", None) or [],
        "view_count": tutorial.view_count,
        "rating_average": float(tutorial.rating_average or 0),
        "rating_count": tutorial.rating_count,
        "created_at": tutorial.created_at.isoformat(),
        "published_at": tutorial.published_at.isoformat() if tutorial.published_at else None,
    }
    if include_sections and tutorial.sections:
        d["sections"] = [
            {
                "id": str(s.id),
                "section_id": s.section_id,
                "heading": s.heading,
                "body_markdown": s.body_markdown,
                "order_index": s.order_index,
                "image_url": s.image_url,
                "image_alt": s.image_alt,
                "image_caption": s.image_caption,
                "video_platform": s.video_platform.value if s.video_platform else None,
                "video_id": s.video_id,
                "video_start_time": s.video_start_time,
            }
            for s in tutorial.sections
        ]
    return d


# ── Tutorial endpoints ────────────────────────────────────────────────────────

@router.get("/tutorials")
async def browse_tutorials(
    material_type: Optional[MaterialType] = None,
    difficulty: Optional[Difficulty] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    filters = [Tutorial.status == TutorialStatus.published]
    if material_type:
        filters.append(Tutorial.material_type == material_type)
    if difficulty:
        filters.append(Tutorial.difficulty == difficulty)
    if search:
        term = f"%{search}%"
        filters.append(or_(Tutorial.title.ilike(term), Tutorial.description.ilike(term)))

    total = (await db.execute(select(func.count(Tutorial.id)).where(and_(*filters)))).scalar()
    q = await db.execute(
        select(Tutorial).where(and_(*filters)).order_by(Tutorial.published_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    tutorials = q.scalars().all()

    # Filter by tag in Python (JSON field)
    if tag:
        tutorials = [t for t in tutorials if t.tags and tag.lower() in [x.lower() for x in t.tags]]

    return {
        "items": [_tutorial_to_dict(t) for t in tutorials],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/tutorials/{slug}")
async def get_tutorial(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(select(Tutorial).where(Tutorial.slug == slug))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    is_staff = current_user and (current_user.is_staff or current_user.is_admin)
    is_author = current_user and str(tutorial.author_id) == str(current_user.id)

    if tutorial.status != TutorialStatus.published and not is_staff and not is_author:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    tutorial.view_count += 1
    await db.commit()

    data = _tutorial_to_dict(tutorial, include_sections=True)

    # Fetch linked ads (for non-premium users)
    if current_user is None:  # Non-logged-in users see ads
        ads_result = await db.execute(
            select(AdPlacement).where(
                AdPlacement.status == AdStatus.active,
                or_(AdPlacement.tutorial_id == tutorial.id, AdPlacement.tutorial_id.is_(None)),
            ).limit(5)
        )
        ads = ads_result.scalars().all()
        data["ads"] = [
            {
                "id": str(a.id),
                "placement_type": a.placement_type.value,
                "creative_type": a.creative_type.value,
                "creative_url": a.creative_url,
                "call_to_action": a.call_to_action,
                "skip_after_seconds": a.skip_after_seconds,
            }
            for a in ads
        ]

    return data


# ── Tutor Mode & Monetization Endpoints ──────────────────────────────────────

@router.post("/tutor/apply")
async def apply_for_tutor(
    req: TutorApplyRequest = TutorApplyRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply for Tutor status and video posting permission. Open to all accounts (free/ordinary)."""
    current_user.is_tutor = True
    current_user.tutor_applied_at = datetime.now(timezone.utc)
    if req.specialty:
        current_user.tutor_specialty = req.specialty

    # If user is staff or admin, auto-approve; otherwise set to pending review
    if current_user.is_staff or current_user.is_admin:
        current_user.tutor_status = "approved"
        current_user.tutor_approved_at = datetime.now(timezone.utc)
        msg = "Tutor posting permission granted automatically (Staff/Admin)."
    else:
        current_user.tutor_status = "pending"
        msg = "Tutor application submitted! Our team will review your application and grant posting permission shortly."

    await db.commit()
    await db.refresh(current_user)
    return {
        "message": msg,
        "is_tutor": current_user.is_tutor,
        "tutor_status": current_user.tutor_status,
        "tutor_specialty": getattr(current_user, "tutor_specialty", None),
    }


@router.post("/tutor/grant-permission")
async def grant_tutor_permission(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Grant video posting permission to the tutor."""
    current_user.is_tutor = True
    current_user.tutor_status = "approved"
    current_user.tutor_approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)
    return {
        "message": "Posting permission granted! You can now upload video tutorials and materials.",
        "tutor_status": "approved",
        "can_post": True,
    }


@router.get("/tutor/dashboard")
async def get_tutor_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the tutor creator dashboard, tutorials, view counts, and view-based earnings."""
    is_tutor = bool(current_user.is_tutor or current_user.is_staff or current_user.is_admin)
    tutor_status = getattr(current_user, "tutor_status", "none")
    can_post = bool(tutor_status == "approved" or current_user.is_staff or current_user.is_admin)

    # Get all tutorials authored by this user
    result = await db.execute(
        select(Tutorial).where(Tutorial.author_id == current_user.id).order_by(Tutorial.created_at.desc())
    )
    tutorials = result.scalars().all()
    total_views = sum(t.view_count for t in tutorials)
    rate_per_view = 1.50  # ₦1.50 per view (₦1,500 per 1,000 views)
    total_earnings = round(total_views * rate_per_view, 2)

    return {
        "is_tutor": is_tutor,
        "tutor_status": tutor_status,
        "can_post": can_post,
        "tutor_specialty": getattr(current_user, "tutor_specialty", None),
        "total_views": total_views,
        "rate_per_view_naira": rate_per_view,
        "rate_per_1000_views_naira": 1500.0,
        "total_earnings_naira": total_earnings,
        "tutorials": [
            {
                "id": str(t.id),
                "slug": t.slug,
                "title": t.title,
                "description": t.description,
                "material_type": t.material_type.value if hasattr(t.material_type, "value") else str(t.material_type),
                "difficulty": t.difficulty.value if hasattr(t.difficulty, "value") else str(t.difficulty),
                "view_count": t.view_count,
                "rating_average": float(t.rating_average) if t.rating_average else 5.0,
                "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                "video_url": getattr(t, "video_url", None),
                "materials_needed": getattr(t, "materials_needed", None) or [],
                "earnings_naira": round(t.view_count * rate_per_view, 2),
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tutorials
        ]
    }


@router.post("/tutor/upload", status_code=status.HTTP_201_CREATED)
async def tutor_upload_tutorial(
    req: TutorUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows approved Tutors to upload video tutorials and material requirements. Requires posting permission."""
    tutor_status = getattr(current_user, "tutor_status", "none")
    can_post = bool(tutor_status == "approved" or current_user.is_staff or current_user.is_admin)

    if not can_post:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A tutor must receive posting permission from Reva Hub before posting a video. Please submit your application for review.",
        )

    base_slug = slugify(req.title)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Tutorial).where(Tutorial.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    tutorial = Tutorial(
        slug=slug,
        title=req.title,
        description=req.description,
        material_type=req.material_type,
        difficulty=req.difficulty,
        estimated_duration_minutes=req.estimated_duration_minutes,
        video_url=req.video_url,
        materials_needed=req.materials_needed or [],
        tags=req.tags or [req.material_type.value],
        author_id=current_user.id,
        author_type=AuthorType.tutor,
        status=TutorialStatus.published,
        published_at=datetime.now(timezone.utc),
    )
    db.add(tutorial)
    await db.flush()

    section = TutorialSection(
        tutorial_id=tutorial.id,
        section_id="overview",
        heading="Tutorial Overview & Video Guide",
        body_markdown=req.content_markdown or req.description,
        order_index=1,
        video_id=req.video_url,
    )
    db.add(section)
    await db.commit()
    await db.refresh(tutorial)

    return {
        "message": "Video tutorial and materials published successfully! You will earn ₦1,500 per 1,000 views.",
        "id": str(tutorial.id),
        "slug": tutorial.slug,
        "title": tutorial.title,
        "view_count": tutorial.view_count,
    }


# ── Interactive Sessions with Tutor Video Creators (Premium Exclusive) ─────────

@router.get("/tutorials/{tutorial_id}/interactive-sessions")
async def get_interactive_sessions(
    tutorial_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve interactive creator sessions and Q&A threads for this tutorial.
    Premium users, staff, and the tutor author see full details and replies.
    """
    tut_res = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = tut_res.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    is_premium = bool(
        current_user and (
            current_user.is_premium
            or current_user.is_staff
            or current_user.is_admin
            or current_user.id == tutorial.author_id
        )
    )

    result = await db.execute(
        select(TutorInteractiveSession)
        .where(TutorInteractiveSession.tutorial_id == tutorial_id)
        .order_by(TutorInteractiveSession.created_at.desc())
    )
    sessions = result.scalars().all()

    # Get tutor details
    tutor_res = await db.execute(select(User).where(User.id == tutorial.author_id))
    tutor_user = tutor_res.scalar_one_or_none()
    tutor_name = tutor_user.name if tutor_user else "Tutor Creator"

    items = []
    for s in sessions:
        student_res = await db.execute(select(User).where(User.id == s.student_id))
        st = student_res.scalar_one_or_none()
        st_name = st.name if st else "Student"

        items.append({
            "id": str(s.id),
            "tutorial_id": str(s.tutorial_id),
            "session_type": s.session_type,
            "status": s.status,
            "timestamp_seconds": s.timestamp_seconds,
            "question_title": s.question_title,
            "details": s.details,
            "student_name": st_name,
            "student_project_url": s.student_project_url if is_premium else None,
            "preferred_date": s.preferred_date if is_premium else None,
            "tutor_name": tutor_name,
            "tutor_reply": s.tutor_reply,
            "meeting_link": s.meeting_link if is_premium else None,
            "replied_at": s.replied_at.isoformat() if s.replied_at else None,
            "created_at": s.created_at.isoformat(),
        })

    return {
        "is_premium_user": is_premium,
        "tutor_id": str(tutorial.author_id),
        "tutor_name": tutor_name,
        "tutor_specialty": getattr(tutor_user, "tutor_specialty", None) if tutor_user else None,
        "total_sessions": len(sessions),
        "sessions": items,
    }


@router.post("/tutorials/{tutorial_id}/interactive-sessions", status_code=status.HTTP_201_CREATED)
async def create_interactive_session(
    tutorial_id: str,
    req: InteractiveSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit an interactive session inquiry or 1-on-1 booking request with the tutor creator.
    Requires an active Reva Hub Premium membership.
    """
    if not (current_user.is_premium or current_user.is_staff or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Interactive Creator Access is exclusively reserved for Reva Hub Premium members. Upgrade to Premium to interact directly with tutor creators.",
        )

    tut_res = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = tut_res.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    session = TutorInteractiveSession(
        tutorial_id=tutorial.id,
        student_id=current_user.id,
        tutor_id=tutorial.author_id,
        session_type=req.session_type,
        status="pending",
        timestamp_seconds=req.timestamp_seconds,
        question_title=req.question_title,
        details=req.details,
        student_project_url=req.student_project_url,
        preferred_date=req.preferred_date,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "message": "Interactive inquiry submitted to the tutor creator! You will receive a direct reply and notification here.",
        "id": str(session.id),
        "status": session.status,
        "session_type": session.session_type,
    }


@router.get("/tutor/interactive-sessions")
async def get_tutor_interactive_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all student interactive inquiries and 1-on-1 requests for the logged-in tutor."""
    result = await db.execute(
        select(TutorInteractiveSession)
        .where(TutorInteractiveSession.tutor_id == current_user.id)
        .order_by(TutorInteractiveSession.created_at.desc())
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        student_res = await db.execute(select(User).where(User.id == s.student_id))
        st = student_res.scalar_one_or_none()
        tut_res = await db.execute(select(Tutorial).where(Tutorial.id == s.tutorial_id))
        tut = tut_res.scalar_one_or_none()

        items.append({
            "id": str(s.id),
            "tutorial_id": str(s.tutorial_id),
            "tutorial_title": tut.title if tut else "Tutorial Video",
            "student_id": str(s.student_id),
            "student_name": st.name if st else "Student",
            "student_email": st.email if st else None,
            "session_type": s.session_type,
            "status": s.status,
            "timestamp_seconds": s.timestamp_seconds,
            "question_title": s.question_title,
            "details": s.details,
            "student_project_url": s.student_project_url,
            "preferred_date": s.preferred_date,
            "tutor_reply": s.tutor_reply,
            "meeting_link": s.meeting_link,
            "replied_at": s.replied_at.isoformat() if s.replied_at else None,
            "created_at": s.created_at.isoformat(),
        })

    return {
        "total": len(items),
        "pending_count": sum(1 for i in items if i["status"] == "pending"),
        "sessions": items,
    }


@router.post("/tutor/interactive-sessions/{session_id}/reply")
async def reply_to_interactive_session(
    session_id: str,
    req: InteractiveSessionReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows the tutor creator to reply to a student inquiry or provide meeting link."""
    result = await db.execute(
        select(TutorInteractiveSession).where(TutorInteractiveSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interactive session request not found")

    if session.tutor_id != current_user.id and not (current_user.is_staff or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Only the tutor author can reply to this session")

    session.tutor_reply = req.reply
    if req.meeting_link:
        session.meeting_link = req.meeting_link
    session.status = req.status or "answered"
    session.replied_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(session)

    return {
        "message": "Reply sent to the Premium student successfully!",
        "id": str(session.id),
        "status": session.status,
        "tutor_reply": session.tutor_reply,
        "meeting_link": session.meeting_link,
        "replied_at": session.replied_at.isoformat(),
    }



@router.post("/tutorials", status_code=status.HTTP_201_CREATED)
async def create_tutorial(
    req: TutorialCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    base_slug = slugify(req.title)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Tutorial).where(Tutorial.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    tutorial = Tutorial(
        slug=slug,
        title=req.title,
        description=req.description,
        material_type=req.material_type,
        material_subtypes=req.material_subtypes,
        difficulty=req.difficulty,
        estimated_duration_minutes=req.estimated_duration_minutes,
        tags=req.tags,
        author_id=current_user.id,
        author_type=AuthorType.admin if current_user.is_admin else AuthorType.staff,
        status=TutorialStatus.draft,
    )
    db.add(tutorial)
    await db.flush()

    for sec in req.sections:
        section = TutorialSection(
            tutorial_id=tutorial.id,
            section_id=sec.section_id,
            heading=sec.heading,
            body_markdown=sec.body_markdown,
            order_index=sec.order_index,
            image_url=sec.image_url,
            image_alt=sec.image_alt,
            image_caption=sec.image_caption,
            video_id=sec.video_id,
            video_start_time=sec.video_start_time,
        )
        db.add(section)

    await db.commit()
    await db.refresh(tutorial)
    return {"id": str(tutorial.id), "slug": tutorial.slug, "message": "Tutorial draft created"}


@router.put("/tutorials/{tutorial_id}")
async def update_tutorial(
    tutorial_id: str,
    req: TutorialUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    is_author = str(tutorial.author_id) == str(current_user.id)
    if not is_author and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if req.title is not None:
        tutorial.title = req.title
    if req.description is not None:
        tutorial.description = req.description
    if req.difficulty is not None:
        tutorial.difficulty = req.difficulty
    if req.estimated_duration_minutes is not None:
        tutorial.estimated_duration_minutes = req.estimated_duration_minutes
    if req.tags is not None:
        tutorial.tags = req.tags

    await db.commit()
    return {"message": "Tutorial updated"}


@router.put("/tutorials/{tutorial_id}/submit-review")
async def submit_for_review(
    tutorial_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    if str(tutorial.author_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if tutorial.status not in (TutorialStatus.draft,):
        raise HTTPException(status_code=400, detail="Tutorial must be in draft to submit for review")

    tutorial.status = TutorialStatus.pending_review
    await db.commit()
    return {"message": "Tutorial submitted for review"}


# ── Skill Paths ───────────────────────────────────────────────────────────────

@router.get("/skill-paths")
@router.get("/paths")
async def browse_skill_paths(
    material_type: Optional[MaterialType] = None,
    difficulty: Optional[Difficulty] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    filters = [SkillPath.is_published.is_(True)]
    if material_type:
        filters.append(SkillPath.material_type == material_type)
    if difficulty:
        filters.append(SkillPath.difficulty == difficulty)

    q = await db.execute(
        select(SkillPath).where(and_(*filters)).order_by(SkillPath.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    paths = q.scalars().all()
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "description": p.description,
            "material_type": p.material_type.value,
            "difficulty": p.difficulty.value,
            "tutorial_count": len(p.tutorials),
        }
        for p in paths
    ]


@router.get("/skill-paths/{path_id}")
@router.get("/paths/{path_id}")
async def get_skill_path(
    path_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(select(SkillPath).where(SkillPath.id == path_id))
    path = result.scalar_one_or_none()
    if not path or not path.is_published:
        raise HTTPException(status_code=404, detail="Skill path not found")

    tutorials = []
    for spt in path.tutorials:
        if spt.tutorial:
            tutorials.append({
                "tutorial_id": str(spt.tutorial_id),
                "slug": spt.tutorial.slug,
                "title": spt.tutorial.title,
                "difficulty": spt.tutorial.difficulty.value,
                "estimated_duration_minutes": spt.tutorial.estimated_duration_minutes,
                "sequence": spt.sequence,
                "is_required": spt.is_required,
                "has_prerequisite": spt.has_prerequisite,
            })

    # User progress if logged in
    user_progress = None
    if current_user:
        prog = await db.execute(
            select(SkillPathProgress).where(
                SkillPathProgress.user_id == current_user.id,
                SkillPathProgress.skill_path_id == path.id,
            )
        )
        p = prog.scalar_one_or_none()
        if p:
            user_progress = {
                "enrolled_at": p.enrolled_at.isoformat(),
                "progress_percentage": float(p.progress_percentage),
                "tutorials_completed": p.tutorials_completed,
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                "badge_awarded": p.badge_awarded,
            }

    return {
        "id": str(path.id),
        "title": path.title,
        "description": path.description,
        "material_type": path.material_type.value,
        "difficulty": path.difficulty.value,
        "tutorials": tutorials,
        "user_progress": user_progress,
    }


@router.post("/skill-paths/{path_id}/enroll")
async def enroll_in_path(
    path_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SkillPath).where(SkillPath.id == path_id))
    path = result.scalar_one_or_none()
    if not path or not path.is_published:
        raise HTTPException(status_code=404, detail="Skill path not found")

    # Idempotent enrollment
    existing = await db.execute(
        select(SkillPathProgress).where(
            SkillPathProgress.user_id == current_user.id,
            SkillPathProgress.skill_path_id == path.id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already enrolled"}

    progress = SkillPathProgress(
        user_id=current_user.id,
        skill_path_id=path.id,
    )
    db.add(progress)
    await db.commit()
    return {"message": "Enrolled in skill path"}


# ── Progress ──────────────────────────────────────────────────────────────────

@router.post("/tutorials/{tutorial_id}/complete")
async def complete_tutorial(
    tutorial_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    prog_result = await db.execute(
        select(TutorialProgress).where(
            TutorialProgress.user_id == current_user.id,
            TutorialProgress.tutorial_id == tutorial.id,
        )
    )
    progress = prog_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if progress:
        if not progress.completed_at:
            progress.completed_at = now
            progress.progress_percentage = 100.0
            progress.last_viewed_at = now
    else:
        progress = TutorialProgress(
            user_id=current_user.id,
            tutorial_id=tutorial.id,
            started_at=now,
            completed_at=now,
            progress_percentage=100.0,
        )
        db.add(progress)

    await db.commit()

    # Update path progress for any enrolled paths containing this tutorial
    paths_result = await db.execute(
        select(SkillPathTutorial).where(SkillPathTutorial.tutorial_id == tutorial.id)
    )
    path_tutorials = paths_result.scalars().all()
    for spt in path_tutorials:
        path_prog_result = await db.execute(
            select(SkillPathProgress).where(
                SkillPathProgress.user_id == current_user.id,
                SkillPathProgress.skill_path_id == spt.skill_path_id,
            )
        )
        path_prog = path_prog_result.scalar_one_or_none()
        if path_prog:
            path_prog.tutorials_completed += 1
            path_prog.last_completed_tutorial_id = tutorial.id
            path_prog.last_activity_at = now
            # Recalculate progress
            total_result = await db.execute(
                select(func.count(SkillPathTutorial.id)).where(
                    SkillPathTutorial.skill_path_id == spt.skill_path_id,
                    SkillPathTutorial.is_required.is_(True),
                )
            )
            total = total_result.scalar() or 1
            path_prog.progress_percentage = min(100.0, (path_prog.tutorials_completed / total) * 100)
            if path_prog.tutorials_completed >= total and not path_prog.completed_at:
                path_prog.completed_at = now
                path_prog.badge_awarded = True

    await db.commit()
    return {"message": "Tutorial marked as complete"}


@router.post("/tutorials/{tutorial_id}/bookmark")
async def toggle_bookmark(
    tutorial_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prog_result = await db.execute(
        select(TutorialProgress).where(
            TutorialProgress.user_id == current_user.id,
            TutorialProgress.tutorial_id == tutorial_id,
        )
    )
    progress = prog_result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if progress:
        progress.is_bookmarked = not progress.is_bookmarked
        progress.last_viewed_at = now
    else:
        progress = TutorialProgress(
            user_id=current_user.id,
            tutorial_id=tutorial_id,
            is_bookmarked=True,
        )
        db.add(progress)

    await db.commit()
    return {"bookmarked": progress.is_bookmarked}


@router.get("/my-progress")
async def my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tut_prog = await db.execute(
        select(TutorialProgress).where(TutorialProgress.user_id == current_user.id)
    )
    path_prog = await db.execute(
        select(SkillPathProgress).where(SkillPathProgress.user_id == current_user.id)
    )

    tutorial_records = tut_prog.scalars().all()
    path_records = path_prog.scalars().all()

    return {
        "tutorials": [
            {
                "tutorial_id": str(p.tutorial_id),
                "progress_percentage": float(p.progress_percentage),
                "is_bookmarked": p.is_bookmarked,
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                "started_at": p.started_at.isoformat(),
            }
            for p in tutorial_records
        ],
        "skill_paths": [
            {
                "skill_path_id": str(p.skill_path_id),
                "enrolled_at": p.enrolled_at.isoformat(),
                "progress_percentage": float(p.progress_percentage),
                "tutorials_completed": p.tutorials_completed,
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                "badge_awarded": p.badge_awarded,
            }
            for p in path_records
        ],
    }


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/tutorials/{tutorial_id}/comments")
async def get_comments(
    tutorial_id: str,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    q = await db.execute(
        select(TutorialComment)
        .where(
            TutorialComment.tutorial_id == tutorial_id,
            TutorialComment.parent_id.is_(None),
            TutorialComment.moderation_status == CommentModerationStatus.approved,
            TutorialComment.deleted_at.is_(None),
        )
        .order_by(TutorialComment.is_pinned.desc(), TutorialComment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    comments = q.scalars().all()

    def comment_dict(c):
        return {
            "id": str(c.id),
            "author_id": str(c.author_id),
            "body": c.body,
            "is_pinned": c.is_pinned,
            "helpful_count": c.helpful_count,
            "created_at": c.created_at.isoformat(),
            "replies": [
                comment_dict(r) for r in (c.replies or [])
                if r.moderation_status == CommentModerationStatus.approved and not r.deleted_at
            ],
        }

    return [comment_dict(c) for c in comments]


@router.post("/tutorials/{tutorial_id}/comments", status_code=status.HTTP_201_CREATED)
async def post_comment(
    tutorial_id: str,
    req: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    if tutorial.status == TutorialStatus.archived:
        raise HTTPException(status_code=400, detail="Archived tutorials do not accept new comments")

    has_links = "http://" in req.body or "https://" in req.body

    # Moderation: new users go to pending, staff/admin auto-approved
    if current_user.is_staff or current_user.is_admin:
        mod_status = CommentModerationStatus.approved
    elif has_links:
        mod_status = CommentModerationStatus.pending  # links flagged for review
    else:
        mod_status = CommentModerationStatus.pending  # default pending for new users

    comment = TutorialComment(
        tutorial_id=tutorial_id,
        author_id=current_user.id,
        parent_id=req.parent_id,
        body=req.body,
        moderation_status=mod_status,
        has_links=has_links,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return {
        "id": str(comment.id),
        "moderation_status": comment.moderation_status.value,
        "message": "Comment submitted" if mod_status == CommentModerationStatus.pending else "Comment posted",
    }


@router.post("/tutorials/{tutorial_id}/comments/{comment_id}/helpful")
async def mark_helpful(
    tutorial_id: str,
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorialComment).where(TutorialComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.helpful_count += 1
    await db.commit()
    return {"helpful_count": comment.helpful_count}


# ── Ratings ───────────────────────────────────────────────────────────────────

@router.post("/tutorials/{tutorial_id}/rate")
async def rate_tutorial(
    tutorial_id: str,
    req: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user has completed the tutorial (optional — allow regardless)
    result = await db.execute(select(Tutorial).where(Tutorial.id == tutorial_id))
    tutorial = result.scalar_one_or_none()
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    # Upsert rating
    existing_result = await db.execute(
        select(TutorialRating).where(
            TutorialRating.tutorial_id == tutorial_id,
            TutorialRating.user_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.rating = req.rating
        existing.feedback = req.feedback
        existing.helpful_for = req.helpful_for
    else:
        rating = TutorialRating(
            tutorial_id=tutorial_id,
            user_id=current_user.id,
            rating=req.rating,
            feedback=req.feedback,
            helpful_for=req.helpful_for,
        )
        db.add(rating)

    await db.flush()

    # Update tutorial aggregate rating
    avg_result = await db.execute(
        select(func.avg(TutorialRating.rating), func.count(TutorialRating.id))
        .where(TutorialRating.tutorial_id == tutorial_id)
    )
    avg, count = avg_result.one()
    tutorial.rating_average = round(float(avg or 0), 2)
    tutorial.rating_count = count or 0

    await db.commit()
    return {"message": "Rating submitted", "new_average": tutorial.rating_average}


# ── Marketplace links ─────────────────────────────────────────────────────────

@router.get("/tutorials/{tutorial_id}/materials")
async def get_tutorial_materials(
    tutorial_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get linked active marketplace listings for a tutorial (3–5 max)."""
    links_result = await db.execute(
        select(MaterialListingLink)
        .where(MaterialListingLink.tutorial_id == tutorial_id)
        .limit(5)
    )
    links = links_result.scalars().all()

    results = []
    for link in links:
        listing_result = await db.execute(
            select(Listing).where(
                Listing.id == link.listing_id,
                Listing.status == ListingStatus.active,
                Listing.moderation_status == ModerationStatus.approved,
            )
        )
        listing = listing_result.scalar_one_or_none()
        if listing:
            results.append({
                "link_id": str(link.id),
                "relevance": link.relevance.value,
                "listing": {
                    "id": str(listing.id),
                    "title": listing.title,
                    "price_ngn": float(listing.price_ngn),
                    "lga": listing.lga,
                    "category": listing.category.value,
                    "slug": listing.slug,
                },
            })

    return results


@router.post("/tutorials/{tutorial_id}/materials/{listing_id}/click")
async def track_material_click(
    tutorial_id: str,
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    link_result = await db.execute(
        select(MaterialListingLink).where(
            MaterialListingLink.tutorial_id == tutorial_id,
            MaterialListingLink.listing_id == listing_id,
        )
    )
    link = link_result.scalar_one_or_none()
    if link:
        link.click_count += 1
        await db.commit()
    return {"tracked": True}


# ── Ad tracking ───────────────────────────────────────────────────────────────

@router.post("/ads/{placement_id}/impression")
async def track_impression(
    placement_id: str,
    tutorial_id: Optional[str] = None,
    was_skipped: Optional[bool] = None,
    view_duration_seconds: Optional[int] = None,
    was_clicked: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    impression = AdImpression(
        placement_id=placement_id,
        tutorial_id=tutorial_id,
        user_id=current_user.id if current_user else None,
        is_premium_user=False,  # Premium not yet implemented
        was_skipped=was_skipped,
        view_duration_seconds=view_duration_seconds,
        was_clicked=was_clicked,
        clicked_at=datetime.now(timezone.utc) if was_clicked else None,
    )
    db.add(impression)
    await db.commit()
    return {"tracked": True}
