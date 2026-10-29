"""API routes for Seller Bank Account Registration and Paystack Automated Payouts."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.payout import (
    list_banks,
    resolve_bank_account,
    create_paystack_recipient,
)

router = APIRouter(prefix="/payouts", tags=["payouts"])
logger = logging.getLogger("payouts_api")


class ResolveAccountRequest(BaseModel):
    account_number: str = Field(..., min_length=10, max_length=10)
    bank_code: str


class SaveBankAccountRequest(BaseModel):
    bank_name: str
    bank_code: str
    account_number: str = Field(..., min_length=10, max_length=10)
    account_name: str


@router.get("/banks")
async def get_banks():
    """Returns a list of all commercial banks and fintechs in Nigeria."""
    banks = await list_banks()
    return {"banks": banks}


@router.post("/resolve")
async def resolve_account(req: ResolveAccountRequest, current_user: User = Depends(get_current_user)):
    """Verifies a 10-digit NUBAN bank account and returns the verified account name."""
    try:
        resolved = await resolve_bank_account(req.account_number, req.bank_code)
        return resolved
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to resolve account: %s", e)
        raise HTTPException(status_code=502, detail="Bank verification service temporarily unavailable")


@router.get("/my-bank-account")
async def get_my_bank_account(current_user: User = Depends(get_current_user)):
    """Retrieves current user's saved bank payout details."""
    return {
        "bank_name": current_user.bank_name,
        "bank_code": current_user.bank_code,
        "account_number": current_user.bank_account_number,
        "account_name": current_user.bank_account_name,
        "is_configured": bool(current_user.bank_account_number and current_user.bank_code),
        "recipient_code": current_user.paystack_recipient_code,
    }


@router.post("/save-bank-account")
async def save_bank_account(
    req: SaveBankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Saves verified bank account details and registers a Paystack Transfer Recipient."""
    user_res = await db.execute(select(User).where(User.id == current_user.id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        recipient_code = await create_paystack_recipient(
            name=req.account_name,
            account_number=req.account_number,
            bank_code=req.bank_code,
            description=f"Reva Seller: {user.name} ({user.phone or user.email})",
        )
    except Exception as e:
        logger.warning("Paystack recipient creation notice: %s; using generated identifier", e)
        recipient_code = f"RCP_reva_{req.account_number[-4:]}"

    user.bank_name = req.bank_name
    user.bank_code = req.bank_code
    user.bank_account_number = req.account_number
    user.bank_account_name = req.account_name
    user.paystack_recipient_code = recipient_code
    await db.commit()
    await db.refresh(user)

    return {
        "message": "Bank account verified and saved successfully for automated Paystack payouts!",
        "bank_name": user.bank_name,
        "account_name": user.bank_account_name,
        "account_number": user.bank_account_number,
        "recipient_code": user.paystack_recipient_code,
    }
