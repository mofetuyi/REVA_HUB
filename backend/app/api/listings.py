"""Listings API routes."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, field_validator
from slugify import slugify
import uuid

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_user, require_seller_mode, get_optional_user, PaginationParams
from app.core.config import settings
from app.models.listing import (
    Listing, ListingPhoto, ListingCategory, ListingUnit, ListingCondition,
    CollectionMethod, ListingStatus, ModerationStatus
)
from app.models.listing_review import (
    ListingReviewResult, PriceReference, PriceRefStatus, ReviewDecision, PriceAssessment
)
from app.models.user import User
from app.services.storage import validate_and_compress_image, upload_file
from app.services.listing_review import review_listing

router = APIRouter(prefix="/listings", tags=["listings"])
logger = logging.getLogger(__name__)


class ListingCreate(BaseModel):
    category: ListingCategory
    title: str
    description: str
    quantity: float
    unit: ListingUnit
    condition: ListingCondition
    condition_notes: Optional[str] = None
    price_ngn: float
    lga: str
    pickup_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    collection_method: CollectionMethod = CollectionMethod.buyer_arranges
    product_group: Optional[str] = None
    photo_urls: list[str] = []

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than zero")
        return v

    @field_validator("price_ngn")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be greater than zero")
        return v

    @field_validator("photo_urls")
    @classmethod
    def photos_limit(cls, v: list) -> list:
        if len(v) > 5:
            raise ValueError("Maximum 5 photos allowed")
        return v


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    condition: Optional[ListingCondition] = None
    condition_notes: Optional[str] = None
    price_ngn: Optional[float] = None
    pickup_address: Optional[str] = None
    collection_method: Optional[CollectionMethod] = None
    photo_urls: Optional[list[str]] = None


class FlagRequest(BaseModel):
    reason: str


def _val(x):
    return x.value if hasattr(x, "value") else str(x) if x is not None else ""


def _listing_to_dict(listing: Listing, include_seller: bool = False) -> dict:
    photos_list = []
    try:
        if "photos" in listing.__dict__ and listing.photos:
            photos_list = [{"url": p.url, "order_index": p.order_index} for p in listing.photos]
    except Exception:
        pass

    d = {
        "id": str(listing.id),
        "seller_id": str(listing.seller_id) if getattr(listing, "seller_id", None) else None,
        "slug": listing.slug,
        "category": _val(listing.category),
        "title": listing.title,
        "description": listing.description,
        "quantity": float(listing.quantity) if listing.quantity is not None else 1.0,
        "unit": _val(listing.unit),
        "condition": _val(listing.condition),
        "condition_notes": listing.condition_notes,
        "price_ngn": float(listing.price_ngn) if listing.price_ngn is not None else 0.0,
        "product_group": getattr(listing, "product_group", None) or ("circular_materials" if _val(listing.category) in ["circular_products", "organic_products"] else "upcycled_products"),
        "state": getattr(listing, "state", "Lagos") or "Lagos",
        "lga": listing.lga or "Lagos",
        "pickup_address": listing.pickup_address,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "collection_method": _val(listing.collection_method),
        "status": _val(listing.status),
        "moderation_status": _val(listing.moderation_status),
        "view_count": listing.view_count or 0,
        "listed_at": listing.listed_at.isoformat() if listing.listed_at else None,
        "expires_at": listing.expires_at.isoformat() if listing.expires_at else None,
        "created_at": listing.created_at.isoformat() if listing.created_at else None,
        "photos": photos_list,
    }
    s = listing.__dict__.get("seller")
    if s:
        d["seller"] = {
            "id": str(s.id),
            "name": s.name,
            "lga": s.lga,
            "average_rating": float(s.average_rating or 5.0),
            "review_count": s.review_count or 0,
            "is_verified_seller": getattr(s, "is_verified_seller", False),
            "avatar_url": s.avatar_url,
            "member_since": s.created_at.isoformat() if getattr(s, "created_at", None) else None,
        }
    else:
        d["seller"] = {
            "id": str(listing.seller_id) if getattr(listing, "seller_id", None) else "",
            "name": "Verified Seller",
            "lga": listing.lga or "Lagos",
            "average_rating": 5.0,
            "review_count": 0,
            "is_verified_seller": True,
            "avatar_url": None,
            "member_since": None,
        }
    return d


async def run_listing_ai_review(listing_id_str: str):
    """Background task to review submitted listing using AI."""
    listing_id = uuid.UUID(listing_id_str)
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Listing).where(Listing.id == listing_id))
        listing = res.scalar_one_or_none()
        if not listing:
            return

        # Lookup approved price reference if available
        pref_q = await db.execute(
            select(PriceReference).where(
                PriceReference.category == listing.category.value,
                PriceReference.unit == listing.unit.value,
                PriceReference.status == PriceRefStatus.approved,
            ).limit(1)
        )
        pref = pref_q.scalar_one_or_none()
        price_range = None
        if pref and pref.min_ngn is not None and pref.max_ngn is not None:
            price_range = {"min_ngn": float(pref.min_ngn), "max_ngn": float(pref.max_ngn)}

        listing_data = {
            "category": listing.category.value,
            "title": listing.title,
            "description": listing.description,
            "quantity": float(listing.quantity),
            "unit": listing.unit.value,
            "condition": listing.condition.value,
            "condition_notes": listing.condition_notes,
            "price_ngn": float(listing.price_ngn),
            "lga": listing.lga,
        }

        review = await review_listing(listing_data, price_range)
        decision = review.get("decision", "needs_review")

        # Map to review result
        review_result = ListingReviewResult(
            listing_id=listing.id,
            decision=ReviewDecision(decision),
            reasons=review.get("reasons", []),
            price_assessment=PriceAssessment(review.get("price_assessment", "cannot_judge")),
            suggested_price_range_ngn=review.get("suggested_price_range_ngn"),
            policy_flags=review.get("policy_flags", []),
            model_used=getattr(settings, "AI_REVIEW_MODEL", "gemini-1.5-flash"),
        )
        db.add(review_result)

        if decision == "approve":
            listing.moderation_status = ModerationStatus.approved
            listing.status = ListingStatus.active
        elif decision == "reject":
            listing.moderation_status = ModerationStatus.rejected
            listing.moderation_notes = "; ".join(review.get("reasons", ["Rejected by policy check"]))
        else:
            listing.moderation_status = ModerationStatus.pending
            listing.moderation_notes = "Flagged for human admin review: " + "; ".join(review.get("reasons", []))

        await db.commit()
        logger.info("Listing %s AI review finished with decision: %s", listing_id, decision)


DEFAULT_CATEGORY_PHOTOS = {
    "circular_products": "/uploads/coconut_husk_coir_fiber.jpg",
    "organic_products": "/uploads/banana_plantain_peels_biomass.jpg",
    "plastic": "/uploads/pet_plastic_flakes.jpg",
    "wood": "/uploads/reclaimed_wood_pallets.jpg",
    "cardboard": "/uploads/cardboard_bales_occ.jpg",
    "clothes": "/uploads/upcycled_denim_bundles.jpg",
    "fabric": "/uploads/textile_fabric_scraps.jpg",
    "leather": "/uploads/leather_tan_roll.jpg",
    "furniture": "/uploads/dasa_recycled_plastic_stool.jpg",
    "fashion": "/uploads/ankara_tote_bags.jpg",
    "crafts": "/uploads/leather_journal_notebook.jpg",
    "other": "/uploads/pet_plastic_flakes.jpg",
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_listing(
    req: ListingCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create and publish a new product or material listing. Automatically activates seller capability."""
    # Ensure user has seller capabilities activated
    if not current_user.is_seller or current_user.current_mode != "seller":
        current_user.is_seller = True
        current_user.current_mode = "seller"
        db.add(current_user)
        await db.flush()

    photo_urls = req.photo_urls or []
    if not photo_urls:
        cat_key = _val(req.category)
        fallback_photo = DEFAULT_CATEGORY_PHOTOS.get(cat_key, "/uploads/pet_plastic_flakes.jpg")
        photo_urls = [fallback_photo]

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.LISTING_EXPIRY_DAYS)

    # Generate unique slug
    base_slug = slugify(f"{req.title} {req.lga}")
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Listing).where(Listing.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    group_val = req.product_group
    if not group_val or group_val not in ["circular_materials", "raw_materials", "upcycled_products"]:
        if _val(req.category) in ["circular_products", "organic_products"]:
            group_val = "circular_materials"
        else:
            group_val = "upcycled_products"

    listing = Listing(
        seller_id=current_user.id,
        slug=slug,
        category=req.category,
        product_group=group_val,
        title=req.title,
        description=req.description,
        quantity=req.quantity,
        unit=req.unit,
        condition=req.condition,
        condition_notes=req.condition_notes,
        price_ngn=req.price_ngn,
        lga=req.lga,
        pickup_address=req.pickup_address,
        latitude=req.latitude,
        longitude=req.longitude,
        collection_method=req.collection_method,
        status=ListingStatus.active,
        moderation_status=ModerationStatus.approved,  # Instantly live and visible to all buyers in Lagos
        listed_at=now,
        expires_at=expires_at,
    )
    db.add(listing)
    await db.flush()

    for i, url in enumerate(photo_urls):
        photo = ListingPhoto(listing_id=listing.id, url=url, order_index=i)
        db.add(photo)

    await db.commit()
    await db.refresh(listing)

    # Trigger AI review in background for safety monitoring
    background_tasks.add_task(run_listing_ai_review, str(listing.id))

    return {
        "id": str(listing.id),
        "slug": listing.slug,
        "title": listing.title,
        "status": listing.status.value,
        "moderation_status": listing.moderation_status.value,
        "message": "Product published successfully and is now live in the marketplace!",
    }


@router.get("")
async def browse_listings(
    category: Optional[ListingCategory] = None,
    group: Optional[str] = None,
    lga: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    condition: Optional[ListingCondition] = None,
    collection_method: Optional[CollectionMethod] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Browse active, moderated listings with filters."""
    try:
        filters = [
            Listing.status == ListingStatus.active,
            Listing.moderation_status == ModerationStatus.approved,
            Listing.expires_at > datetime.now(timezone.utc),
        ]

        if group:
            if group in ["circular_materials", "raw_materials"]:
                filters.append(or_(Listing.product_group == "circular_materials", Listing.product_group == "raw_materials"))
            elif group == "upcycled_products":
                filters.append(Listing.product_group == "upcycled_products")

        if category:
            filters.append(Listing.category == category)
        if lga:
            filters.append(Listing.lga == lga)
        if price_min is not None:
            filters.append(Listing.price_ngn >= price_min)
        if price_max is not None:
            filters.append(Listing.price_ngn <= price_max)
        if condition:
            filters.append(Listing.condition == condition)
        if collection_method:
            filters.append(Listing.collection_method == collection_method)
        if search:
            term = f"%{search}%"
            filters.append(or_(Listing.title.ilike(term), Listing.description.ilike(term)))

        # Count
        count_q = await db.execute(select(func.count(Listing.id)).where(and_(*filters)))
        total = count_q.scalar() or 0

        # Sort
        order_col = Listing.listed_at.desc()
        if sort == "price_asc":
            order_col = Listing.price_ngn.asc()
        elif sort == "price_desc":
            order_col = Listing.price_ngn.desc()
        elif sort == "most_viewed":
            order_col = Listing.view_count.desc()

        offset = (page - 1) * page_size
        q = await db.execute(
            select(Listing).options(selectinload(Listing.photos), selectinload(Listing.seller)).where(and_(*filters)).order_by(order_col)
            .offset(offset).limit(page_size)
        )
        listings = q.scalars().all()

        return {
            "items": [_listing_to_dict(lst) for lst in listings],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size if total else 0,
        }
    except Exception as e:
        import traceback
        logger.exception("browse_listings error: %s", e)
        raise HTTPException(status_code=500, detail=f"Listings error: {type(e).__name__}: {e}\n{traceback.format_exc()}")


@router.get("/{listing_id}")
async def get_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get listing detail by ID or slug."""
    # Try UUID first, then slug
    q = select(Listing).options(selectinload(Listing.photos), selectinload(Listing.seller))
    try:
        uuid.UUID(listing_id)
        q = q.where(Listing.id == listing_id)
    except ValueError:
        q = q.where(Listing.slug == listing_id)

    result = await db.execute(q)
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if getattr(listing, "seller", None) is None and getattr(listing, "seller_id", None):
        seller_res = await db.execute(select(User).where(User.id == listing.seller_id))
        listing.seller = seller_res.scalar_one_or_none()

    # Only show active/approved to regular users (sellers see own listings)
    is_own = current_user and str(current_user.id) == str(listing.seller_id)
    is_admin = current_user and current_user.is_admin
    if not is_own and not is_admin:
        if listing.status not in (ListingStatus.active,) or listing.moderation_status != ModerationStatus.approved:
            raise HTTPException(status_code=404, detail="Listing not found")

    # Increment view count
    listing.view_count += 1
    await db.commit()

    return _listing_to_dict(listing, include_seller=True)


@router.put("/{listing_id}")
async def update_listing(
    listing_id: str,
    req: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if str(listing.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if req.title is not None:
        listing.title = req.title
    if req.description is not None:
        listing.description = req.description
    if req.quantity is not None:
        if req.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")
        listing.quantity = req.quantity
    if req.condition is not None:
        listing.condition = req.condition
    if req.condition_notes is not None:
        listing.condition_notes = req.condition_notes
    if req.price_ngn is not None:
        if req.price_ngn <= 0:
            raise HTTPException(status_code=400, detail="Price must be > 0")
        listing.price_ngn = req.price_ngn
    if req.pickup_address is not None:
        listing.pickup_address = req.pickup_address
    if req.collection_method is not None:
        listing.collection_method = req.collection_method

    if req.photo_urls is not None and len(req.photo_urls) > 0:
        await db.execute(delete(ListingPhoto).where(ListingPhoto.listing_id == listing.id))
        for idx, url_str in enumerate(req.photo_urls[:5]):
            new_p = ListingPhoto(
                listing_id=listing.id,
                url=url_str,
                order_index=idx,
            )
            db.add(new_p)

    listing.moderation_status = ModerationStatus.approved
    listing.status = ListingStatus.active

    await db.commit()
    return {"message": "Listing updated", "id": str(listing.id), "slug": listing.slug}


@router.delete("/{listing_id}")
async def delist_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if str(listing.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    listing.status = ListingStatus.delisted
    await db.commit()
    return {"message": "Listing delisted"}


@router.post("/{listing_id}/flag")
async def flag_listing(
    listing_id: str,
    req: FlagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing.flag_count += 1
    listing.is_flagged = True
    listing.flagged_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Listing flagged for review"}


@router.post("/{listing_id}/renew")
async def renew_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if str(listing.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.now(timezone.utc)
    listing.expires_at = now + timedelta(days=settings.LISTING_EXPIRY_DAYS)
    if listing.status == ListingStatus.expired:
        listing.status = ListingStatus.active
    await db.commit()
    return {"message": "Listing renewed for 90 days", "expires_at": listing.expires_at.isoformat()}


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload and compress a listing photo. Returns the storage URL."""
    content_type = file.content_type or "image/jpeg"
    file_bytes = await file.read()

    try:
        compressed = validate_and_compress_image(file_bytes, content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = await upload_file(compressed, folder=f"listings/{current_user.id}")
    return result


@router.get("/{listing_id}/related")
async def related_listings(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    q = await db.execute(
        select(Listing).options(selectinload(Listing.photos))
        .where(
            Listing.id != listing.id,
            Listing.category == listing.category,
            Listing.status == ListingStatus.active,
            Listing.moderation_status == ModerationStatus.approved,
        )
        .limit(4)
    )
    related = q.scalars().all()
    return [_listing_to_dict(lst) for lst in related]
