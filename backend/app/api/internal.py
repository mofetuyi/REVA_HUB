"""Internal API Router for n8n Automation and Background Workflows.

All endpoints require the 'X-Internal-Key' header matching settings.INTERNAL_API_KEY.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.deps import verify_internal_key
from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.services.payment import send_seller_payout

router = APIRouter(prefix="/internal", tags=["internal-automation"], dependencies=[Depends(verify_internal_key)])


@router.get("/health")
async def internal_health_check():
    """Verify n8n connection and internal API credentials."""
    return {
        "status": "connected",
        "service": "Reva Hub n8n Automation Gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "auth_type": "X-Internal-Key",
    }


@router.get("/db-test")
async def db_test():
    """Test raw database connection and return error traceback if failing."""
    import traceback
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text, select
        from app.models.user import User
        from app.models.listing import Listing
        async with AsyncSessionLocal() as session:
            r1 = await session.execute(text("SELECT 1;"))
            raw_val = r1.scalar()

            try:
                r2 = await session.execute(select(User).limit(1))
                u = r2.scalar_one_or_none()
                user_res = f"User query OK, found: {u.id if u else 'none'}"
            except Exception as eu:
                user_res = f"User query FAILED: {type(eu).__name__}: {eu}\n{traceback.format_exc()}"

            try:
                r3 = await session.execute(select(Listing).limit(1))
                l = r3.scalar_one_or_none()
                listing_res = f"Listing query OK, found: {l.id if l else 'none'}"
            except Exception as el:
                listing_res = f"Listing query FAILED: {type(el).__name__}: {el}\n{traceback.format_exc()}"

            return {
                "status": "ok",
                "raw_val": raw_val,
                "user_res": user_res,
                "listing_res": listing_res,
            }
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc(),
        }


@router.get("/seed-run")
async def seed_run():
    """Manually trigger marketplace listing and tutorial seeding with full exception reporting."""
    import traceback
    from datetime import datetime, timezone, timedelta
    from app.core.database import AsyncSessionLocal
    from app.models.listing import Listing, ListingPhoto, ListingCategory, ListingUnit, ListingCondition, ListingStatus, ModerationStatus, CollectionMethod
    from app.models.user import User
    from app.models.tutorial import Tutorial, TutorialSection, MaterialType, Difficulty, TutorialStatus, AuthorType
    from sqlalchemy import select

    results = {"seeded": [], "errors": []}
    try:
        async with AsyncSessionLocal() as db:
            admin_q = await db.execute(select(User).where(User.phone == "+2347076630396"))
            admin_user = admin_q.scalar_one_or_none()
            if not admin_user:
                admin_q2 = await db.execute(select(User).limit(1))
                admin_user = admin_q2.scalar_one_or_none()

            if not admin_user:
                return {"status": "error", "error": "No user found to assign as seller"}

            now = datetime.now(timezone.utc)
            sample_listings = [
                {
                    "title": "Refurbished Solid Hardwood Furniture & Office Desks Lot",
                    "slug": "refurbished-solid-hardwood-furniture-ikeja",
                    "category": ListingCategory.wood,
                    "description": "Restored and refinished solid wood office desks, dining tables, bookshelves, and conference chairs. High-durability hardwood recovered and upcycled by local carpenters in Ikeja.",
                    "quantity": 12,
                    "unit": ListingUnit.pieces,
                    "condition": ListingCondition.like_new,
                    "price_ngn": 185000.0,
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "pickup_address": "Plot 14 Industrial Avenue, Ikeja Industrial Estate, Lagos",
                    "photo": "/uploads/furniture_wood_showroom.jpg",
                },
                {
                    "title": "Premium Tan Vegetable-Tanned Leather Hide & Upholstery Offcuts",
                    "slug": "premium-tan-vegetable-tanned-leather-mushin",
                    "category": ListingCategory.leather,
                    "description": "Full grain vegetable-tanned leather hide rolls and offcut bundles from Lagos leather manufacturing workshops. Supple, clean finish ideal for footwear, bags, and luxury crafts.",
                    "quantity": 25,
                    "unit": ListingUnit.pieces,
                    "condition": ListingCondition.like_new,
                    "price_ngn": 35000.0,
                    "state": "Lagos",
                    "lga": "Mushin",
                    "pickup_address": "Ladipo Leather Market, Mushin, Lagos",
                    "photo": "/uploads/leather_tan_roll.jpg",
                },
                {
                    "title": "Handmade Upcycled Rustic Leather Journal & Bound Notebooks",
                    "slug": "handmade-upcycled-rustic-leather-journal-surulere",
                    "category": ListingCategory.circular_products,
                    "description": "Handcrafted artisan journal created from 100% recovered leather offcuts and unbleached recycled cotton paper with vintage wraparound leather tie cord.",
                    "quantity": 50,
                    "unit": ListingUnit.pieces,
                    "condition": ListingCondition.new,
                    "price_ngn": 8500.0,
                    "state": "Lagos",
                    "lga": "Surulere",
                    "pickup_address": "18 Adeniran Ogunsanya St, Surulere, Lagos",
                    "photo": "/uploads/leather_journal_notebook.jpg",
                },
                {
                    "title": "Compacted Corrugated Cardboard Bales (Mill Grade OCC)",
                    "slug": "compacted-corrugated-cardboard-bales-apapa",
                    "category": ListingCategory.cardboard,
                    "description": "Dense mill-ready compacted corrugated cardboard boxes and paper packaging bales. Strapped with high-tensile bands, ready for pulping or packaging conversion.",
                    "quantity": 10,
                    "unit": ListingUnit.tonnes,
                    "condition": ListingCondition.mixed,
                    "price_ngn": 120000.0,
                    "state": "Lagos",
                    "lga": "Apapa",
                    "pickup_address": "Wharf Road Terminal, Apapa Port Area, Lagos",
                    "photo": "/uploads/cardboard_bales_occ.jpg",
                },
                {
                    "title": "Sorted Clean Cotton & Ankara Textile Scrap Bundles",
                    "slug": "sorted-clean-cotton-ankara-textile-scraps-yaba",
                    "category": ListingCategory.fabric,
                    "description": "Clean garment factory and tailor offcuts sorted by color. Excellent for yarn recycling, knitting, patchwork quilting, and rag rug crafting in Yaba.",
                    "quantity": 250,
                    "unit": ListingUnit.kg,
                    "condition": ListingCondition.new,
                    "price_ngn": 28000.0,
                    "state": "Lagos",
                    "lga": "Lagos Mainland",
                    "pickup_address": "Commercial Avenue, Sabo Yaba, Lagos",
                    "photo": "/uploads/textile_fabric_scraps.jpg",
                },
            ]

            for item in sample_listings:
                try:
                    existing = (await db.execute(select(Listing).where(Listing.slug == item["slug"]))).scalar_one_or_none()
                    if not existing:
                        lst = Listing(
                            seller_id=admin_user.id,
                            slug=item["slug"],
                            category=item["category"],
                            title=item["title"],
                            description=item["description"],
                            quantity=item["quantity"],
                            unit=item["unit"],
                            condition=item["condition"],
                            price_ngn=item["price_ngn"],
                            state=item["state"],
                            lga=item["lga"],
                            pickup_address=item["pickup_address"],
                            status=ListingStatus.active,
                            moderation_status=ModerationStatus.approved,
                            collection_method=CollectionMethod.buyer_arranges,
                            listed_at=now,
                            expires_at=now + timedelta(days=90),
                        )
                        db.add(lst)
                        await db.flush()
                        photo = ListingPhoto(listing_id=lst.id, url=item["photo"], order_index=0)
                        db.add(photo)
                        results["seeded"].append(item["title"])
                except Exception as sub_e:
                    results["errors"].append({"title": item["title"], "error": str(sub_e), "trace": traceback.format_exc()})

            await db.commit()

            # Align tutorials table schema in Neon
            from sqlalchemy import text
            for col_sql in [
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS seasonal_expiry DATE;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS revision_notes TEXT;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS material_subtypes JSON;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;",
            ]:
                try:
                    await db.execute(text(col_sql))
                    await db.commit()
                except Exception as e_col:
                    await db.rollback()
                    results.setdefault("tutorial_schema_warnings", []).append(f"{col_sql}: {e_col}")

            # Check and seed knitting tutorial
            knit_slug = "how-to-knit-beginner-guide-yarn"
            existing_knit = (await db.execute(select(Tutorial).where(Tutorial.slug == knit_slug))).scalar_one_or_none()
            if not existing_knit:
                knit_tut = Tutorial(
                    slug=knit_slug,
                    title="How to Knit: Complete Beginner Guide with Recovered Yarn",
                    description="Step-by-step beginner guide to knitting with recovered yarn, wool, and textile strips. Master casting on, the knit stitch, and casting off.",
                    material_type=MaterialType.fabric,
                    difficulty=Difficulty.beginner,
                    estimated_duration_minutes=25,
                    video_url="https://www.youtube.com/watch?v=p_R1UDsNOMk",
                    materials_needed=["Reclaimed Wool / Textile Yarn", "Pair of Knitting Needles (5mm - 8mm)", "Scissors", "Tapestry Needle"],
                    tags=["knitting", "fabric", "yarn", "diy", "craft", "upcycling"],
                    author_id=admin_user.id,
                    author_type=AuthorType.staff,
                    status=TutorialStatus.published,
                    view_count=650,
                    published_at=now,
                )
                db.add(knit_tut)
                await db.flush()
                sec = TutorialSection(
                    tutorial_id=knit_tut.id,
                    section_id="intro",
                    heading="Introduction to Knitting & Casting On",
                    body_markdown="Knitting is one of the most rewarding upcycling skills. In this video, you will learn how to turn recovered wool skeins and fabric strips into warm winter beanies, scarves, and coasters.",
                    order_index=1,
                    video_id="https://www.youtube.com/watch?v=p_R1UDsNOMk",
                )
                db.add(sec)
                results["seeded_tutorial"] = knit_tut.title

            await db.commit()
            return {"status": "ok", "results": results}
    except Exception as ge:
        return {"status": "error", "error": str(ge), "trace": traceback.format_exc()}


@router.get("/stats/summary")
async def get_automation_summary(db: AsyncSession = Depends(get_db)):
    """Summary metrics for n8n digests and alerting."""
    # Active listings
    listing_count_result = await db.execute(
        select(func.count(Listing.id)).where(Listing.status == ListingStatus.active)
    )
    active_listings = listing_count_result.scalar() or 0

    # Orders count by status
    order_counts = {}
    for st in [OrderStatus.funded, OrderStatus.in_transit, OrderStatus.delivered, OrderStatus.completed, OrderStatus.disputed]:
        res = await db.execute(select(func.count(Order.id)).where(Order.status == st))
        order_counts[st.value] = res.scalar() or 0

    # Total completed GMV
    gmv_result = await db.execute(
        select(func.sum(Order.total_amount_naira)).where(Order.status == OrderStatus.completed)
    )
    total_gmv = float(gmv_result.scalar() or 0)

    # Pending payouts
    pending_payouts_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.completed,
            Order.seller_payout_status != "transferred"
        )
    )
    pending_payouts_count = pending_payouts_result.scalar() or 0

    return {
        "active_listings": active_listings,
        "orders": order_counts,
        "total_completed_gmv_naira": total_gmv,
        "pending_seller_payouts": pending_payouts_count,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/orders/pending-payouts")
async def list_pending_seller_payouts(db: AsyncSession = Depends(get_db)):
    """Fetch completed orders where the 94% seller payout has not yet completed."""
    result = await db.execute(
        select(Order).where(
            Order.status == OrderStatus.completed,
            Order.seller_payout_status != "transferred"
        ).order_by(Order.completed_at.asc())
    )
    orders = result.scalars().all()

    return [
        {
            "order_id": str(o.id),
            "order_reference": o.order_reference,
            "seller_id": str(o.seller_id),
            "total_amount_naira": float(o.total_amount_naira),
            "seller_earnings_naira": float(o.seller_earnings_naira),
            "seller_payout_status": o.seller_payout_status,
            "completed_at": o.completed_at.isoformat() if o.completed_at else None,
        }
        for o in orders
    ]


@router.post("/orders/{order_id}/trigger-payout")
async def trigger_payout(order_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger Paystack 94% seller transfer for an order via n8n automation."""
    try:
        oid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order UUID")

    result = await db.execute(select(Order).where(Order.id == oid))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payout_res = await send_seller_payout(
        order_id=str(order.id),
        seller_id=str(order.seller_id),
        amount_naira=float(order.seller_earnings_naira or (float(order.total_amount_naira) * 0.94)),
        currency=order.currency or "NGN",
    )

    order.seller_payout_reference = payout_res.get("reference")
    order.seller_payout_status = payout_res.get("status", "pending")
    await db.commit()

    return {
        "status": "payout_triggered",
        "order_id": str(order.id),
        "seller_payout_reference": order.seller_payout_reference,
        "seller_payout_status": order.seller_payout_status,
        "details": payout_res,
    }


@router.get("/listings/recent")
async def get_recent_listings(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Fetch recent listings for n8n notifications (e.g. Discord, Telegram, or WhatsApp alerts)."""
    result = await db.execute(
        select(Listing).order_by(Listing.created_at.desc()).limit(limit)
    )
    listings = result.scalars().all()

    return [
        {
            "id": str(l.id),
            "title": l.title,
            "material_type": l.material_type,
            "category": l.category,
            "price_naira": float(l.price_naira),
            "state": l.state,
            "lga": l.lga,
            "status": l.status.value,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in listings
    ]
