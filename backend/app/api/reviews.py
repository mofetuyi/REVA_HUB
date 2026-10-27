"""Reviews API routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.review import Review, ReviewType
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.services.verified_seller import check_and_update_badge, update_user_rating

router = APIRouter(tags=["reviews"])
logger = logging.getLogger(__name__)


class ReviewCreate(BaseModel):
    order_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(
    req: ReviewCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a review after a completed order."""
    result = await db.execute(select(Order).where(Order.id == req.order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    is_buyer = str(order.buyer_id) == str(current_user.id)
    is_seller = str(order.seller_id) == str(current_user.id)

    if not is_buyer and not is_seller:
        raise HTTPException(status_code=403, detail="Not authorized")

    if order.status != OrderStatus.completed:
        raise HTTPException(status_code=400, detail="Reviews can only be left after order is completed")

    # Check for duplicate
    existing = await db.execute(
        select(Review).where(
            Review.order_id == order.id,
            Review.reviewer_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this order")

    if is_buyer:
        review_type = ReviewType.buyer_reviews_seller
        reviewee_id = order.seller_id
        is_public = True  # Seller reviews are public
    else:
        review_type = ReviewType.seller_reviews_buyer
        reviewee_id = order.buyer_id
        is_public = False  # Buyer reviews are internal

    review = Review(
        order_id=order.id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        rating=req.rating,
        title=req.title,
        comment=req.comment,
        review_type=review_type,
        is_public=is_public,
        is_verified_purchase=True,
    )
    db.add(review)
    await db.commit()

    # Update aggregate rating and badge
    background_tasks.add_task(update_user_rating, str(reviewee_id), db)
    if is_buyer:
        background_tasks.add_task(check_and_update_badge, str(reviewee_id), db)

    return {"message": "Review submitted", "id": str(review.id)}


@router.get("/users/{user_id}/reviews")
async def get_user_reviews(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get public reviews for a seller."""
    q = await db.execute(
        select(Review)
        .where(
            Review.reviewee_id == user_id,
            Review.is_public.is_(True),
            Review.review_type == ReviewType.buyer_reviews_seller,
        )
        .order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    reviews = q.scalars().all()
    return [
        {
            "id": str(r.id),
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "is_verified_purchase": r.is_verified_purchase,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@router.get("/orders/{order_id}/review")
async def get_order_review(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get review for an order (own orders only)."""
    order_result = await db.execute(select(Order).where(Order.id == order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(current_user.id) and str(order.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    review_result = await db.execute(
        select(Review).where(
            Review.order_id == order_id,
            Review.reviewer_id == current_user.id,
        )
    )
    review = review_result.scalar_one_or_none()
    if not review:
        return None
    return {
        "id": str(review.id),
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "created_at": review.created_at.isoformat(),
    }
