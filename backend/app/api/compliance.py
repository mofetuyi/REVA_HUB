"""Trust, Safety and Compliance API endpoints.

Report button, appeals, enforcement actions, admin compliance queue.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, field_validator
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.compliance import (
    Report, ReportTargetType, ReportReason, ReportStatus,
    EnforcementAction, EnforcementLevel, EnforcementStatus,
    ModerationLog, StaffSetting,
)

router = APIRouter(prefix="/compliance", tags=["compliance"])
logger = logging.getLogger(__name__)


# ── Schemas ─────────────────────────────────────────────────────────────────

class SubmitReportRequest(BaseModel):
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    description: str
    evidence_urls: Optional[List[str]] = None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Please provide a more detailed description (at least 10 characters)")
        return v.strip()


class AppealRequest(BaseModel):
    appeal_text: str

    @field_validator("appeal_text")
    @classmethod
    def validate_appeal(cls, v: str) -> str:
        if len(v.strip()) < 20:
            raise ValueError("Appeal must be at least 20 characters")
        return v.strip()


class ResolveReportRequest(BaseModel):
    resolution: str  # resolved | dismissed
    notes: Optional[str] = None


class EnforcementRequest(BaseModel):
    target_user_id: str
    level: EnforcementLevel
    reason: str
    internal_notes: Optional[str] = None
    report_id: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def submit_report(
    req: SubmitReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a report for a listing, user, tutorial, review, or order."""
    target_uuid = uuid.UUID(req.target_id)
    report = Report(
        reporter_id=current_user.id,
        target_type=req.target_type,
        target_id=target_uuid,
        reason=req.reason,
        description=req.description,
        evidence_urls=req.evidence_urls or [],
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    logger.info("Report submitted by user %s: type=%s id=%s reason=%s",
                current_user.id, req.target_type, req.target_id, req.reason)
    return {"id": str(report.id), "status": report.status}


@router.post("/enforcement/{action_id}/appeal")
async def submit_appeal(
    action_id: str,
    req: AppealRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit an appeal against an enforcement action."""
    action_uuid = uuid.UUID(action_id)
    result = await db.execute(
        select(EnforcementAction).where(EnforcementAction.id == action_uuid)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Enforcement action not found")
    if str(action.target_user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorised")
    if action.appeal_submitted_at:
        raise HTTPException(status_code=400, detail="Appeal already submitted for this action")

    action.appeal_text = req.appeal_text
    action.appeal_submitted_at = datetime.now(timezone.utc)
    action.status = EnforcementStatus.appealed
    await db.commit()
    return {"message": "Appeal submitted. A staff member will review it."}


# ── Admin endpoints ──────────────────────────────────────────────────────────

@router.get("/admin/reports")
async def list_reports(
    status_filter: Optional[ReportStatus] = Query(None, alias="status"),
    target_type: Optional[ReportTargetType] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = select(Report).order_by(desc(Report.created_at))
    if status_filter:
        q = q.where(Report.status == status_filter)
    if target_type:
        q = q.where(Report.target_type == target_type)
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    reports = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "reporter_id": str(r.reporter_id),
            "target_type": r.target_type,
            "target_id": str(r.target_id),
            "reason": r.reason,
            "description": r.description,
            "evidence_urls": r.evidence_urls,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.post("/admin/reports/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    req: ResolveReportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    report_uuid = uuid.UUID(report_id)
    result = await db.execute(select(Report).where(Report.id == report_uuid))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = ReportStatus.resolved if req.resolution == "resolved" else ReportStatus.dismissed
    report.resolution_notes = req.notes
    report.resolved_by_id = admin.id
    report.resolved_at = datetime.now(timezone.utc)

    log = ModerationLog(
        admin_id=admin.id,
        action=f"resolve_report_{req.resolution}",
        target_type="report",
        target_id=report.id,
        notes=req.notes,
    )
    db.add(log)
    await db.commit()
    return {"status": report.status}


@router.post("/admin/enforcement")
async def create_enforcement_action(
    req: EnforcementRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target_uuid = uuid.UUID(req.target_user_id)
    report_uuid = uuid.UUID(req.report_id) if req.report_id else None

    action = EnforcementAction(
        target_user_id=target_uuid,
        admin_id=admin.id,
        report_id=report_uuid,
        level=req.level,
        reason=req.reason,
        internal_notes=req.internal_notes,
        evidence_preserved=True,
    )
    db.add(action)

    if req.level in (
        EnforcementLevel.suspension,
        EnforcementLevel.termination,
        EnforcementLevel.urgent_protective,
    ):
        user_result = await db.execute(select(User).where(User.id == target_uuid))
        target = user_result.scalar_one_or_none()
        if target:
            target.is_restricted = True
            target.restriction_reason = req.reason
            target.restricted_at = datetime.now(timezone.utc)
            target.restricted_by_id = admin.id

    log = ModerationLog(
        admin_id=admin.id,
        action=f"enforcement_{req.level}",
        target_type="user",
        target_id=target_uuid,
        notes=req.reason,
        metadata_={"level": req.level, "report_id": req.report_id},
    )
    db.add(log)
    await db.commit()
    return {"id": str(action.id), "level": action.level}


@router.get("/admin/enforcement")
async def list_enforcement_actions(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = select(EnforcementAction).order_by(desc(EnforcementAction.created_at))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    actions = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "target_user_id": str(a.target_user_id),
            "level": a.level,
            "status": a.status,
            "reason": a.reason,
            "appeal_submitted_at": a.appeal_submitted_at.isoformat() if a.appeal_submitted_at else None,
            "created_at": a.created_at.isoformat(),
        }
        for a in actions
    ]
