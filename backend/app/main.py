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

