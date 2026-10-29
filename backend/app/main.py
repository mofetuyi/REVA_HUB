"""Reva Hub FastAPI main application."""

import logging
import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, HTMLResponse, Response
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
            admin_q = await db.execute(select(User).where(User.phone.in_(["+2347076630396", "07076630396"])))
            admin_user = admin_q.scalar_one_or_none()
            if not admin_user:
                admin_user = User(
                    phone="+2347076630396",
                    name="Mofetuyi (Platform Administrator)",
                    email="admin@revahub.ng",
                    hashed_password=hash_password("mofe12345"),
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
            else:
                admin_user.hashed_password = hash_password("mofe12345")
                admin_user.is_staff = True
                admin_user.is_admin = True
                admin_user.is_active = True
                admin_user.is_phone_verified = True
                admin_user.is_email_verified = True
            await db.commit()
            if admin_user:
                await db.refresh(admin_user)
            logger.info("Auto-provisioned and synced primary administrator account (+2347076630396 / mofe12345)")

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
                {
                    "title": "Clean HDPE Blue Drum Flakes (Washed & Dried)",
                    "slug": "clean-hdpe-blue-drum-flakes-ikeja",
                    "category": ListingCategory.plastic,
                    "description": "High-density polyethylene flakes from industrial blue drums. Hot washed, metal-separated, and ready for extrusion/molding in Ikeja.",
                    "quantity": 2500,
                    "unit": ListingUnit.kg,
                    "condition": ListingCondition.like_new,
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
                    "condition": ListingCondition.like_new,
                    "price_ngn": 350.0,
                    "state": "Lagos",
                    "lga": "Oshodi-Isolo",
                    "pickup_address": "Oshodi Recovery Depot, Agege Motor Road, Lagos",
                    "photo": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop",
                },
            ]

            for item in sample_listings:
                existing_lst = (await db.execute(select(Listing).where(Listing.slug == item["slug"]))).scalar_one_or_none()
                if not existing_lst:
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
            logger.info("Marketplace listings seeded and committed successfully.")

            # Ensure tutorial table schema is aligned
            from sqlalchemy import text
            for col_sql in [
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS seasonal_expiry DATE;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS revision_notes TEXT;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS material_subtypes JSON;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS image_alt VARCHAR(500);",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS image_caption TEXT;",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS video_platform VARCHAR(50);",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS video_id VARCHAR(100);",
                "ALTER TABLE tutorial_sections ADD COLUMN IF NOT EXISTS video_start_time INTEGER;",
                "ALTER TABLE listing_photos ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500);",
                "ALTER TABLE listings ADD COLUMN IF NOT EXISTS product_group VARCHAR(50) DEFAULT 'circular_materials';",
            ]:
                try:
                    await db.execute(text(col_sql))
                    await db.commit()
                except Exception as e_col:
                    await db.rollback()
                    logger.warning("Tutorial schema notice for '%s': %s", col_sql, e_col)

            # Auto-seed Knitting Tutorial in Reva Learn
            from app.models.tutorial import Tutorial, TutorialSection, MaterialType, Difficulty, TutorialStatus, AuthorType
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

            await db.commit()
            logger.info("Marketplace listings and Reva Learn tutorials checked & synchronized successfully.")
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
PRIMARY_DOMAIN = "reva-marketplace.com.ng"
allowed_origins = list(settings.allowed_origins_list) + [
    f"https://{PRIMARY_DOMAIN}",
    f"https://www.{PRIMARY_DOMAIN}",
    f"http://{PRIMARY_DOMAIN}",
    "https://reva-hub-q6pp.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.reva-marketplace\.com\.ng|reva-marketplace\.com\.ng|.*\.revahub\.ng)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Domain 301 Redirect & Security Headers Middleware ─────────────────────────
@app.middleware("http")
async def domain_redirect_and_security_middleware(request: Request, call_next):
    host_header = request.headers.get("host", "").lower().split(":")[0]
    raw_path = request.url.path

    # Canonical 301 Redirect: redirect browser page navigations on render domain or www to https://reva-marketplace.com.ng
    # Keep API endpoints, non-GET requests, assets, uploads, and health/internal checks functioning seamlessly
    is_api_or_asset = (
        request.method != "GET"
        or raw_path.startswith(("/api", "/auth", "/listings", "/offers", "/orders", "/webhooks", "/reviews", "/admin", "/gemini", "/compliance", "/price_refs", "/assets", "/uploads", "/favicon", "/logo"))
        or raw_path in ["/health", "/docs", "/openapi.json", "/redoc", "/robots.txt", "/sitemap.xml"]
        or raw_path.startswith("/internal")
        or bool(request.headers.get("x-internal-key"))
    )

    if not is_api_or_asset and host_header in ["reva-hub-q6pp.onrender.com", f"www.{PRIMARY_DOMAIN}", "www.revahub.ng"]:
        query_suffix = f"?{request.url.query}" if request.url.query else ""
        canonical_target = f"https://{PRIMARY_DOMAIN}{raw_path}{query_suffix}"
        return RedirectResponse(url=canonical_target, status_code=status.HTTP_301_MOVED_PERMANENTLY)

    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if host_header == PRIMARY_DOMAIN or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response


# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("← %s %s [%s]", request.method, request.url.path, response.status_code)
    return response


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "ok",
        "service": "Reva Hub API",
        "domain": PRIMARY_DOMAIN,
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


# ── Dynamic SEO Endpoints (Robots.txt & Sitemap.xml) ──────────────────────────
@app.get("/robots.txt", include_in_schema=False)
async def get_robots_txt():
    robots_content = f"""User-agent: *
Allow: /
Allow: /marketplace
Allow: /learn
Allow: /premium
Allow: /about
Allow: /terms
Allow: /privacy
Allow: /listings/
Disallow: /admin
Disallow: /staff
Disallow: /api/
Disallow: /internal/

Sitemap: https://{PRIMARY_DOMAIN}/sitemap.xml
"""
    return Response(content=robots_content, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def get_sitemap_xml():
    sitemap_file = os.path.join(FRONTEND_DIST, "sitemap.xml")
    if os.path.isfile(sitemap_file):
        try:
            with open(sitemap_file, "r", encoding="utf-8") as f:
                return Response(content=f.read(), media_type="application/xml")
        except Exception as e:
            logger.warning("Error reading sitemap file: %s", e)

    fallback_sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://{PRIMARY_DOMAIN}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://{PRIMARY_DOMAIN}/marketplace</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>
  <url><loc>https://{PRIMARY_DOMAIN}/learn</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>https://{PRIMARY_DOMAIN}/premium</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
</urlset>"""
    return Response(content=fallback_sitemap, media_type="application/xml")


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


# ── Single-domain Static Assets, SSR Prerender & SPA Fallback ────────────────
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
)

if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    uploads_dir = os.path.join(FRONTEND_DIST, "uploads")
    if os.path.isdir(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            resp = FileResponse(file_path)
            # Efficient caching headers
            if "/assets/" in file_path or full_path.startswith("assets/"):
                resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico", ".woff2")):
                resp.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"
            return resp

        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            try:
                with open(index_file, "r", encoding="utf-8") as f:
                    html_content = f.read()

                # Dynamic SEO Meta & Prerender Injection for Social Sharing and Crawlers
                path_lower = full_path.lower().strip("/")
                canonical_url = f"https://{PRIMARY_DOMAIN}/{path_lower}" if path_lower else f"https://{PRIMARY_DOMAIN}/"

                page_title = "Reva Hub – Recover. Trade. Learn. | Lagos Circular Marketplace"
                page_desc = "Nigeria's premier circular economy marketplace for recovered plastics, fabrics, wood, cardboard and circular craft goods. Trade safely with Paystack escrow."
                prerender_body = ""

                if path_lower.startswith("marketplace"):
                    page_title = "Recovered Materials Marketplace | Reva Hub Lagos"
                    page_desc = "Browse active lots of recovered plastics, fabric offcuts, hardwood lumber, OCC cardboard bales, and upcycled artisan goods across Lagos."
                    prerender_body = "<div class='seo-prerender' style='display:none;'><h1>Lagos Recovered Materials Marketplace</h1><p>Trade industrial HDPE flakes, PET bottles, fabric scraps, reclaimed hardwood furniture, and cardboard bales with secure escrow.</p></div>"
                elif path_lower.startswith("learn"):
                    page_title = "Reva Learn – Circular Skills & DIY Upcycling Tutorials"
                    page_desc = "Master creative circular crafting with step-by-step video guides: how to knit with recovered yarn, self-watering planters, pallet furniture, and tote bags."
                    prerender_body = "<div class='seo-prerender' style='display:none;'><h1>Reva Learn: Circular Economy Skills</h1><p>Watch step-by-step masterclasses on knitting recovered textiles, building pallet tables, and crafting circular products.</p></div>"
                elif path_lower.startswith("premium"):
                    page_title = "Reva Premium Membership – Priority Deals & Zero Commissions"
                    page_desc = "Unlock exclusive wholesale recovered lots, priority transport dispatch, zero commission trading, and verified trader badges on Reva Hub."

                html_content = re.sub(r'<title>.*?</title>', f'<title>{page_title}</title>', html_content)
                html_content = re.sub(r'<meta name="description" content=".*?" />', f'<meta name="description" content="{page_desc}" />', html_content)
                html_content = re.sub(r'<link rel="canonical" href=".*?" />', f'<link rel="canonical" href="{canonical_url}" />', html_content)
                html_content = re.sub(r'<meta property="og:title" content=".*?" />', f'<meta property="og:title" content="{page_title}" />', html_content)
                html_content = re.sub(r'<meta property="og:description" content=".*?" />', f'<meta property="og:description" content="{page_desc}" />', html_content)
                html_content = re.sub(r'<meta property="og:url" content=".*?" />', f'<meta property="og:url" content="{canonical_url}" />', html_content)

                if prerender_body:
                    html_content = html_content.replace('<div id="root">', f'<div id="root">{prerender_body}')

                resp = HTMLResponse(content=html_content)
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                return resp
            except Exception as e:
                logger.error("Error reading index.html: %s", e)
                return FileResponse(index_file)

        return JSONResponse(status_code=404, content={"detail": "Not found"})

