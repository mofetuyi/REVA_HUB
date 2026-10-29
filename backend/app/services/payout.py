"""Paystack automated seller bank verification and direct transfer payout service."""

import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("payouts")
PAYSTACK_BASE = "https://api.paystack.co"

# Curated list of major Nigerian commercial banks & fintechs with their Paystack bank codes
NIGERIAN_BANKS = [
    {"name": "Access Bank", "code": "044"},
    {"name": "Carbon", "code": "565"},
    {"name": "Citibank Nigeria", "code": "023"},
    {"name": "Ecobank Nigeria", "code": "050"},
    {"name": "Fidelity Bank", "code": "070"},
    {"name": "First Bank of Nigeria", "code": "011"},
    {"name": "First City Monument Bank (FCMB)", "code": "214"},
    {"name": "Guaranty Trust Bank (GTBank)", "code": "058"},
    {"name": "Heritage Bank", "code": "030"},
    {"name": "Jaiz Bank", "code": "301"},
    {"name": "Keystone Bank", "code": "082"},
    {"name": "Kuda Microfinance Bank", "code": "090267"},
    {"name": "Moniepoint MFB", "code": "50515"},
    {"name": "OPay", "code": "999992"},
    {"name": "PalmPay", "code": "999991"},
    {"name": "Polaris Bank", "code": "076"},
    {"name": "Providus Bank", "code": "101"},
    {"name": "Stanbic IBTC Bank", "code": "221"},
    {"name": "Standard Chartered Bank", "code": "068"},
    {"name": "Sterling Bank", "code": "232"},
    {"name": "Suntrust Bank", "code": "100"},
    {"name": "Taj Bank", "code": "302"},
    {"name": "Titan Trust Bank", "code": "102"},
    {"name": "Union Bank of Nigeria", "code": "032"},
    {"name": "United Bank for Africa (UBA)", "code": "033"},
    {"name": "Unity Bank", "code": "215"},
    {"name": "VFD Microfinance Bank", "code": "566"},
    {"name": "Wema Bank", "code": "035"},
    {"name": "Zenith Bank", "code": "057"},
]


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.PAYMENT_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def list_banks() -> List[Dict[str, str]]:
    """Retrieves list of banks from Paystack or uses curated Nigerian banks list."""
    if settings.payment_configured:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.get(f"{PAYSTACK_BASE}/bank?country=nigeria", headers=_headers())
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") and data.get("data"):
                        return [{"name": b["name"], "code": b["code"]} for b in data["data"]]
        except Exception as e:
            logger.warning("Could not fetch banks from Paystack API: %s; using curated list", e)
    return NIGERIAN_BANKS


async def resolve_bank_account(account_number: str, bank_code: str) -> Dict[str, Any]:
    """Resolves a 10-digit NUBAN account number with the bank to get account holder name."""
    if not account_number or len(account_number) != 10:
        raise ValueError("Account number must be exactly 10 digits")
    
    if settings.payment_configured:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.get(
                    f"{PAYSTACK_BASE}/bank/resolve?account_number={account_number}&bank_code={bank_code}",
                    headers=_headers(),
                )
                data = res.json()
                if not data.get("status"):
                    raise ValueError(data.get("message", "Could not resolve bank account"))
                return {
                    "account_number": data["data"]["account_number"],
                    "account_name": data["data"]["account_name"],
                    "bank_id": data["data"].get("bank_id"),
                }
        except httpx.HTTPError as err:
            logger.error("Paystack bank resolution network error: %s", err)
            raise ValueError("Bank resolution service is currently unavailable")

    # In test/mock mode without live keys: simulate realistic verified account name
    bank_name = next((b["name"] for b in NIGERIAN_BANKS if b["code"] == bank_code), "Nigerian Bank")
    return {
        "account_number": account_number,
        "account_name": f"VERIFIED SELLER ({bank_name.upper()})",
        "mock": True,
    }


async def create_paystack_recipient(
    name: str,
    account_number: str,
    bank_code: str,
    description: str = "Reva Marketplace Seller",
) -> str:
    """Creates a reusable Paystack Transfer Recipient and returns recipient_code (RCP_...)."""
    if settings.payment_configured:
        try:
            payload = {
                "type": "nuban",
                "name": name,
                "account_number": account_number,
                "bank_code": bank_code,
                "currency": "NGN",
                "description": description,
            }
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.post(f"{PAYSTACK_BASE}/transferrecipient", headers=_headers(), json=payload)
                data = res.json()
                if not data.get("status"):
                    raise ValueError(data.get("message", "Failed to create transfer recipient on Paystack"))
                return data["data"]["recipient_code"]
        except httpx.HTTPError as err:
            logger.error("Paystack recipient creation error: %s", err)
            raise ValueError(f"Could not register bank account with Paystack: {err}")

    # Mock mode fallback
    return f"RCP_mock_{account_number[-4:]}"


async def disburse_seller_payout(
    recipient_code: str,
    amount_ngn: float,
    order_id: str,
) -> Dict[str, Any]:
    """Transfers funds directly to the seller's registered bank account via Paystack Transfers."""
    amount_kobo = int(round(amount_ngn * 100))
    if settings.payment_configured and not recipient_code.startswith("RCP_mock_"):
        try:
            payload = {
                "source": "balance",
                "amount": amount_kobo,
                "recipient": recipient_code,
                "reason": f"Reva Hub order payout {order_id}",
            }
            async with httpx.AsyncClient(timeout=25) as client:
                res = await client.post(f"{PAYSTACK_BASE}/transfer", headers=_headers(), json=payload)
                data = res.json()
                if not data.get("status"):
                    logger.error("Paystack transfer failed: %s", data)
                    return {"status": "failed", "message": data.get("message")}
                return {
                    "status": "success",
                    "transfer_code": data["data"]["transfer_code"],
                    "reference": data["data"].get("reference"),
                }
        except Exception as e:
            logger.exception("Paystack disbursement error: %s", e)
            return {"status": "failed", "error": str(e)}

    # Mock success for testing / dev mode
    return {
        "status": "success",
        "transfer_code": f"TRF_mock_{order_id[:8]}",
        "reference": f"ref_{order_id[:8]}",
        "mock": True,
    }
