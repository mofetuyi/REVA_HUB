"""Users and public profiles API endpoints."""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.user import User
from app.models.listing import Listing, ListingStatus

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


def _parse_uuid(val: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(val).strip())
    except Exception:
        return None


@router.get("/{user_id}/profile")
async def get_user_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Retrieve public profile for a user by UUID or 'me'."""
    target_user: Optional[User] = None

    if user_id == "me":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        target_user = current_user
    else:
        parsed_id = _parse_uuid(user_id)
        if not parsed_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
        result = await db.execute(select(User).where(User.id == parsed_id))
        target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    created_at_val = None
    if hasattr(target_user, "created_at") and target_user.created_at:
        created_at_val = target_user.created_at.isoformat()
    else:
        created_at_val = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(target_user.id),
        "name": target_user.name or "Reva Trader",
        "avatar_url": target_user.avatar_url,
        "lga": target_user.lga or "Lagos",
        "state": target_user.state or "Lagos",
        "business_name": target_user.business_name,
        "is_verified_seller": bool(target_user.is_verified_seller),
        "is_premium": bool(target_user.is_premium),
        "reva_id": target_user.reva_id,
        "created_at": created_at_val,
        "average_rating": float(target_user.average_rating or 5.0) if target_user.average_rating else 5.0,
        "review_count": int(target_user.review_count or 0),
        "completed_orders_count": int(target_user.completed_orders_count or 0),
    }


@router.get("/{user_id}/listings")
async def get_user_public_listings(
    user_id: str,
    status: Optional[str] = Query("active"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Retrieve active listings created by a user."""
    target_id: Optional[uuid.UUID] = None

    if user_id == "me":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        target_id = current_user.id
    else:
        target_id = _parse_uuid(user_id)
        if not target_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    stmt = (
        select(Listing)
        .options(selectinload(Listing.photos))
        .where(Listing.seller_id == target_id)
    )

    if status and status.lower() == "active":
        stmt = stmt.where(Listing.status == ListingStatus.active)

    stmt = stmt.order_by(Listing.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    items = result.scalars().all()

    output = []
    for item in items:
        photos = []
        if hasattr(item, "photos") and item.photos:
            photos = [{"url": p.url, "display_order": getattr(p, "display_order", 0)} for p in item.photos]

        cat_val = item.category.value if hasattr(item.category, "value") else str(item.category)
        unit_val = item.unit.value if hasattr(item.unit, "value") else str(item.unit)

        output.append({
            "id": str(item.id),
            "title": item.title,
            "description": item.description or "",
            "category": cat_val,
            "price_ngn": float(item.price_ngn or 0),
            "quantity": float(item.quantity or 0),
            "unit": unit_val,
            "lga": item.lga or "Lagos",
            "photos": photos,
            "created_at": item.created_at.isoformat() if hasattr(item, "created_at") and item.created_at else None,
        })

    return output
