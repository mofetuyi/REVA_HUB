"""Staff-only API endpoints.

Staff members are authenticated with the same JWT system but require is_staff=True.
The staff area is NOT secured by URL obscurity — it is secured by server-side role checks
on every endpoint. The URL is simply not listed in public navigation.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.core.deps import get_current_user, require_staff
from app.models.user import User
from app.models.compliance import StaffSetting, ModerationLog

router = APIRouter(prefix="/staff", tags=["staff"])
logger = logging.getLogger(__name__)

EXPECTED_WEBHOOK_PATH = "/webhooks/payment"


class WebhookURLRequest(BaseModel):
    webhook_url: str

    @field_validator("webhook_url")
    @classmethod
    def validate_webhook_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("https://"):
            raise ValueError("Webhook URL must use HTTPS")
        if not v.endswith(EXPECTED_WEBHOOK_PATH):
            raise ValueError(
                f"Webhook URL must end with {EXPECTED_WEBHOOK_PATH} "
                f"(e.g. https://api.yourdomain.com{EXPECTED_WEBHOOK_PATH})"
            )
        return v


@router.get("/settings")
async def get_staff_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """Retrieve current staff settings. Never exposes secret keys."""
    result = await db.execute(select(StaffSetting))
    settings_list = result.scalars().all()
    return {
        s.key: {
            "value": s.value,
            "description": s.description,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in settings_list
    }


@router.put("/settings/webhook-url")
async def set_webhook_url(
    req: WebhookURLRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Save the Paystack webhook URL for reference.
    
    IMPORTANT: Saving this URL inside Reva does NOT register it with Paystack.
    After saving, copy this URL and register it in your Paystack Dashboard:
    Dashboard → Settings → API Keys & Webhooks → Webhook URL
    """
    result = await db.execute(select(StaffSetting).where(StaffSetting.key == "paystack_webhook_url"))
    setting = result.scalar_one_or_none()

    if setting:
        old_value = setting.value
        setting.value = req.webhook_url
        setting.updated_by_id = current_user.id
        setting.updated_at = datetime.now(timezone.utc)
    else:
        setting = StaffSetting(
            key="paystack_webhook_url",
            value=req.webhook_url,
            description="Paystack webhook URL. Must be registered in Paystack Dashboard separately.",
            updated_by_id=current_user.id,
        )
        db.add(setting)
        old_value = None

    log = ModerationLog(
        admin_id=current_user.id,
        action="update_webhook_url",
        target_type="staff_setting",
        notes=f"Webhook URL updated. Old: {old_value}",
    )
    db.add(log)
    await db.commit()

    logger.info("Webhook URL updated by staff %s: %s", current_user.id, req.webhook_url)

    return {
        "saved_url": req.webhook_url,
        "status": "saved",
        "warning": (
            "This URL has been saved in Reva but is NOT yet registered with Paystack. "
            "You must manually register it in your Paystack Dashboard → Settings → API Keys & Webhooks. "
            "The webhook is not live until Paystack is configured and a verified test event succeeds."
        ),
        "next_steps": [
            "Copy the saved URL above",
            "Log in to your Paystack Dashboard",
            "Navigate to Settings → API Keys & Webhooks",
            "Paste the URL in the Webhook URL field",
            "Save and send a test event to verify",
        ],
    }


@router.get("/settings/webhook-status")
async def get_webhook_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """Return current webhook URL configuration status without exposing secrets."""
    result = await db.execute(
        select(StaffSetting).where(StaffSetting.key == "paystack_webhook_url")
    )
    setting = result.scalar_one_or_none()

    return {
        "webhook_url": setting.value if setting else None,
        "configured_in_reva": setting is not None and bool(setting.value),
        "last_updated": setting.updated_at.isoformat() if setting and setting.updated_at else None,
        "paystack_registration_status": "unknown",
        "note": (
            "Reva cannot automatically verify whether Paystack has been configured with this URL. "
            "Send a test webhook from your Paystack Dashboard to verify the connection is live."
        ),
    }
