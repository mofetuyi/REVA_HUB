"""Reva Hub FastAPI main application."""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import auth, listings, offers, orders, webhooks, reviews, admin, learn, gemini, compliance, staff, price_refs, internal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    logger.info("=== Reva Hub Platform starting ===")
    settings.validate_production_settings()
    logger.info("Environment: %s", settings.ENVIRONMENT)
    logger.info("Integration status:")
    logger.info("  Gemini AI:         %s", "✓ CONFIGURED" if settings.gemini_configured else "✗ NOT configured (set GEMINI_API_KEY)")
    logger.info("  Resend Email:      %s", "✓ CONFIGURED" if settings.resend_configured else "✗ NOT configured (set RESEND_API_KEY)")
    logger.info("  SMS OTP:           %s", "✓ CONFIGURED" if settings.sms_configured else "✗ NOT configured – OTPs logged to console")
    logger.info("  Payment (Paystack):%s", "✓ CONFIGURED" if settings.payment_configured else "✗ NOT configured – mock checkout active")
    logger.info("  Object Storage:    %s", "✓ CONFIGURED" if settings.storage_configured else "✗ NOT configured – placeholder URLs used")
    logger.info("  KYC Provider:      %s", "✓ CONFIGURED" if settings.kyc_configured else "✗ NOT configured")
    logger.info("Escrow auto-release: %s", "ENABLED" if settings.ESCROW_AUTO_RELEASE_ENABLED else "DISABLED (safe default – requires explicit enable)")
    logger.info("Commission rate:     %s%%", settings.MARKETPLACE_COMMISSION_RATE * 100)

    # Auto-seed primary admin and sample listings on boot
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.listing import Listing, ListingPhoto, ListingCategory, ListingUnit, ListingCondition, ListingStatus, ModerationStatus, CollectionMethod
        from app.models.user import User, AccountType, UserMode, KYCStatus
        from app.core.security import hash_password
        from sqlalchemy import select, func
        from datetime import datetime, timezone, timedelta

        async with AsyncSessionLocal() as db:
            admin_q = await db.execute(select(User).where(User.phone == "+2347076630396"))
            admin_user = admin_q.scalar_one_or_none()
            if not admin_user:
                admin_user = User(
                    phone="+2347076630396",
                    name="Mofetuyi (Platform Administrator)",
                    email="admin@revahub.ng",
                    hashed_password=hash_password("admin1234"),
                    account_type=AccountType.business,
                    is_phone_verified=True,
                    is_email_verified=True,
                    is_staff=True,
                    is_admin=True,
                    is_active=True,
                    is_buyer=True,
                    is_seller=True,
                    current_mode=UserMode.seller,
                    kyc_status=KYCStatus.verified,
                )
                db.add(admin_user)
                await db.commit()
                await db.refresh(admin_user)
                logger.info("Auto-provisioned primary administrator account (+2347076630396)")

            listing_count_q = await db.execute(select(func.count(Listing.id)))
            count = listing_count_q.scalar() or 0
            if count == 0:
                logger.info("Database has 0 listings. Seeding marketplace with recovered materials...")
                now = datetime.now(timezone.utc)
                sample_listings = [
                    {
                        "title": "Clean HDPE Blue Drum Flakes (Washed & Dried)",
                        "slug": "clean-hdpe-blue-drum-flakes-ikeja",
                        "category": ListingCategory.plastic,
                        "description": "High-density polyethylene flakes from industrial blue drums. Hot washed, metal-separated, and ready for extrusion/molding in Ikeja.",
                        "quantity": 2500,
                        "unit": ListingUnit.kg,
                        "condition": ListingCondition.cleaned,
                        "price_ngn": 480.0,
                        "state": "Lagos",
                        "lga": "Ikeja",
                        "pickup_address": "Plot 12 Commercial Avenue, Ikeja Industrial Estate",
                        "photo": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop",
                    },
                    {
                        "title": "Sorted Clear PET Bottle Bales (Grade A)",
                        "slug": "sorted-clear-pet-bottle-bales-oshodi",
                        "category": ListingCategory.plastic,
                        "description": "100% transparent beverage bottles compressed into 250kg bales. Caps and labels removed. Ideal for bottle-to-bottle fiber production.",
                        "quantity": 5000,
                        "unit": ListingUnit.kg,
                        "condition": ListingCondition.sorted,
                        "price_ngn": 350.0,
                        "state": "Lagos",
                        "lga": "Oshodi-Isolo",
                        "pickup_address": "Oshodi Recovery Depot, Agege Motor Road, Lagos",
                        "photo": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop",
                    },
                    {
                        "title": "Stripped Bright Copper Wire Scrap (Millberry 99.9%)",
                        "slug": "stripped-bright-copper-wire-mushin",
                        "category": ListingCategory.metal,
                        "description": "Clean, unalloyed copper wire scrap without insulation. Purity >99.9%. Ready for smelting and immediate dispatch in Mushin.",
                        "quantity": 850,
                        "unit": ListingUnit.kg,
                        "condition": ListingCondition.cleaned,
                        "price_ngn": 8200.0,
                        "state": "Lagos",
                        "lga": "Mushin",
                        "pickup_address": "Ladipo Metals Yard, Mushin, Lagos",
                        "photo": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600&auto=format&fit=crop",
                    },
                    {
                        "title": "Baled Corrugated OCC Cardboard (Factory Grade)",
                        "slug": "baled-corrugated-occ-cardboard-apapa",
                        "category": ListingCategory.paper,
                        "description": "Dense mill-ready cardboard bales from packaging warehouses in Apapa Port. Low moisture (<10%), zero wax.",
                        "quantity": 10000,
                        "unit": ListingUnit.kg,
                        "condition": ListingCondition.sorted,
                        "price_ngn": 180.0,
                        "state": "Lagos",
                        "lga": "Apapa",
                        "pickup_address": "Wharf Road Logistics Hub, Apapa, Lagos",
                        "photo": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop",
                    },
                    {
                        "title": "Scrap Aluminum Ingot & Extrusion Offcuts",
                        "slug": "scrap-aluminum-ingot-extrusion-ikorodu",
                        "category": ListingCategory.metal,
                        "description": "6063 architectural aluminum extrusions and clean melted ingots. Clean surface, minimal paint.",
                        "quantity": 3200,
                        "unit": ListingUnit.kg,
                        "condition": ListingCondition.sorted,
                        "price_ngn": 2400.0,
                        "state": "Lagos",
                        "lga": "Ikorodu",
                        "pickup_address": "Ikorodu Scrap Terminal, Sagamu Road, Lagos",
                        "photo": "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=600&auto=format&fit=crop",
                    },
                ]

                for item in sample_listings:
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

                await db.commit()
                logger.info("Successfully seeded %d sample Lagos marketplace listings", len(sample_listings))
    except Exception as exc:
        logger.warning("Startup seeding notice (non-blocking): %s", exc)

    yield
    logger.info("=== Reva Hub Platform shutting down ===")


app = FastAPI(
    title="Reva Hub API",
    description="Reva Hub – Lagos recovered materials marketplace and learning platform",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Redact Authorization header from logs
    logger.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("← %s %s [%s]", request.method, request.url.path, response.status_code)
    return response


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "integrations": {
            "gemini": settings.gemini_configured,
            "resend": settings.resend_configured,
            "sms": settings.sms_configured,
            "payment": settings.payment_configured,
            "storage": settings.storage_configured,
            "kyc": settings.kyc_configured,
        },
        "escrow_auto_release_enabled": settings.ESCROW_AUTO_RELEASE_ENABLED,
    }


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(offers.router)
app.include_router(orders.router)
app.include_router(webhooks.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(learn.router)
app.include_router(gemini.router)
app.include_router(compliance.router)
app.include_router(staff.router)
app.include_router(price_refs.router)
app.include_router(internal.router)


# ── Single-domain Static Assets & SPA Fallback ───────────────────────────────
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
)

if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Not found"})

