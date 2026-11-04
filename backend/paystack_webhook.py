import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException, Header, Response

app = FastAPI()

SECRET_KEY = "sk_test_705cc6033f529b9cd756010cf4019eb22bb14f08"

@app.post("/api/paystack-webhook")
async def paystack_webhook(request: Request, x_paystack_signature: str = Header(None)):
    # 1. Capture the exact raw byte string sent by Paystack
    raw_body = await request.body()
    
    # 2. Compute local hash signature
    computed_signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        raw_body,
        hashlib.sha512
    ).hexdigest()

    # 3. Check for unauthorized access
    if computed_signature != x_paystack_signature:
        raise HTTPException(status_code=401, detail="Invalid Signature")

    # 4. Success. Parse JSON data out of raw bytes
    event = await request.json()
    
    if event.get("event") == "charge.success":
        data = event.get("data")
        reference = data.get("reference")
        amount = data.get("amount")
        
        # --- YOUR DATABASE LOGIC HERE ---
        # Deliver digital goods or fund wallet.

    return Response(status_code=200)
