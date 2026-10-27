"""Price Reference API — admin management of material price ranges."""

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.listing_review import PriceReference, PriceRefStatus, Confidence
from app.models.compliance import ModerationLog

router = APIRouter(prefix="/price-refs", tags=["price-references"])
logger = logging.getLogger(__name__)


class PriceRefRequest(BaseModel):
    category: str
    material: str
    unit: str
    min_ngn: Optional[float] = None
    max_ngn: Optional[float] = None
    sources: Optional[list] = None
    sample_size: int = 0
    confidence: Confidence = Confidence.low
    notes: Optional[str] = None


@router.get("/")
async def list_price_refs(
    status_filter: Optional[PriceRefStatus] = Query(None, alias="status"),
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(PriceReference).order_by(desc(PriceReference.updated_at))
    if status_filter:
        q = q.where(PriceReference.status == status_filter)
    if category:
        q = q.where(PriceReference.category == category)
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    refs = result.scalars().all()
    return [_serialize_ref(r) for r in refs]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_price_ref(
    req: PriceRefRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ref = PriceReference(**req.model_dump())
    db.add(ref)
    await db.commit()
    await db.refresh(ref)
    return _serialize_ref(ref)


@router.put("/{ref_id}")
async def update_price_ref(
    ref_id: str,
    req: PriceRefRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ref_uuid = uuid.UUID(ref_id)
    result = await db.execute(select(PriceReference).where(PriceReference.id == ref_uuid))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Price reference not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(ref, k, v)
    await db.commit()
    return _serialize_ref(ref)


@router.post("/{ref_id}/approve")
async def approve_price_ref(
    ref_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ref_uuid = uuid.UUID(ref_id)
    result = await db.execute(select(PriceReference).where(PriceReference.id == ref_uuid))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Price reference not found")
    if ref.min_ngn is None or ref.max_ngn is None:
        raise HTTPException(status_code=400, detail="Cannot approve a range with no min/max values")
    ref.status = PriceRefStatus.approved
    ref.approved_by_id = admin.id
    ref.approved_at = datetime.now(timezone.utc)

    log = ModerationLog(
        admin_id=admin.id,
        action="approve_price_ref",
        target_type="price_reference",
        target_id=ref.id,
        notes=f"Approved: {ref.category}/{ref.material} {ref.unit} ₦{ref.min_ngn}–₦{ref.max_ngn}",
    )
    db.add(log)
    await db.commit()
    return _serialize_ref(ref)


@router.post("/{ref_id}/reject")
async def reject_price_ref(
    ref_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ref_uuid = uuid.UUID(ref_id)
    result = await db.execute(select(PriceReference).where(PriceReference.id == ref_uuid))
    ref = result.scalar_one_or_none()
    if not ref:
        raise HTTPException(status_code=404, detail="Price reference not found")
    ref.status = PriceRefStatus.stale
    await db.commit()
    return {"status": "rejected"}


def _serialize_ref(r: PriceReference) -> dict:
    return {
        "id": str(r.id),
        "category": r.category,
        "material": r.material,
        "unit": r.unit,
        "min_ngn": float(r.min_ngn) if r.min_ngn is not None else None,
        "max_ngn": float(r.max_ngn) if r.max_ngn is not None else None,
        "status": r.status,
        "sources": r.sources,
        "sample_size": r.sample_size,
        "confidence": r.confidence,
        "notes": r.notes,
        "updated_at": r.updated_at.isoformat(),
        "approved_by_id": str(r.approved_by_id) if r.approved_by_id else None,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
    }
