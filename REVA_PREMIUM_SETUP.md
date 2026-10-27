# REVA_PREMIUM_SETUP.md — Reva Hub Premium Configuration and Deployment Guide

> ⚠️ **Security note**: A Paystack live key was shared earlier in chat. Keys shared in chat should 
> be rotated promptly. Configure the replacement key only through your hosting provider's 
> environment-variable or secrets manager settings — never paste it into chat or commit it to git.

---

## Overview

Reva Hub Premium is a paid subscription that unlocks seller and buyer benefits. Payment is handled 
through Paystack's hosted Payment Page. Reva Hub does not handle card data directly.

**Payment page**: https://paystack.shop/pay/reva

---

## How Premium activation works

1. A user opens Reva Settings, copies their Reva ID (format: `REVA-xxxxxxxx-...`).
2. They visit https://paystack.shop/pay/reva and enter their Reva ID in the custom field named **REVA ID number**.
3. Paystack processes the payment and sends a `charge.success` webhook to Reva's backend.
4. Reva validates the webhook signature, verifies the transaction server-side with Paystack, checks the amount, looks up the user by Reva ID, and activates Premium.
5. The user's Premium status updates in the app within seconds.

---

## Required environment variables

Set these in your backend hosting provider's environment or secrets manager. **Never commit `.env` to git.**

### Payment

```
PAYMENT_SECRET_KEY=sk_live_...        # Your Paystack secret key — server-side only, never in frontend
PAYMENT_WEBHOOK_SECRET=...            # Paystack webhook signature secret (from Paystack Dashboard)
```

### Premium

```
# REQUIRED: The Paystack amount in kobo (100 kobo = ₦1).
# Set this to the EXACT amount configured in your Paystack Payment Page.
# If not set, Premium activation is BLOCKED — no payment can accidentally activate Premium.
PREMIUM_AMOUNT_KOBO=                  # e.g. 500000 for ₦5,000 — you must set this

# REQUIRED: How many days a Premium subscription lasts.
# If not set, Premium activation is BLOCKED.
PREMIUM_DURATION_DAYS=                # e.g. 365 for one year — you must set this

# Optional: the Paystack Payment Page URL (shown in UI)
PREMIUM_PAGE_URL=https://paystack.shop/pay/reva

# The exact Paystack custom field name collecting the user's Reva ID
# Must match what you configured in the Paystack Payment Page editor
PREMIUM_REVA_ID_FIELD=REVA ID number
```

### Other integrations

```
GEMINI_API_KEY=...          # AI listing review and Reva AI chat — server-side only
RESEND_API_KEY=...          # Transactional email — server-side only
SMS_API_KEY=...             # SMS OTP (Termii or Africa's Talking)
KYC_API_KEY=...             # KYC provider
S3_BUCKET_NAME=...          # File storage
```

---

## Paystack setup checklist

1. **Create a Payment Page** at https://paystack.com/  
   Go to: Payment Pages → Create Page → name it "Reva Premium"

2. **Add a custom field**  
   Field name (display): `REVA ID number`  
   Field type: Text  
   Required: Yes

3. **Set the amount**  
   Set the price in NGN. Note the kobo value (multiply NGN × 100) and set it as `PREMIUM_AMOUNT_KOBO`.

4. **Register your webhook URL**  
   In Paystack Dashboard → Settings → API Keys & Webhooks:  
   Webhook URL: `https://YOUR_API_HOST/webhooks/payment`  
   
   You can save this URL in the Reva Staff Dashboard for reference, but saving it there does NOT register it with Paystack — you must configure it in the Paystack Dashboard directly.

5. **Test with a test key first**  
   Use `sk_test_...` and a test Payment Page before switching to live keys.

6. **Confirm webhook is working**  
   Paystack Dashboard → Settings → Webhooks → Send test event.  
   Check your backend logs for successful verification.

---

## Open decisions that the owner must set

| Decision | Config var | Current default | Action needed |
|---|---|---|---|
| Premium price | `PREMIUM_AMOUNT_KOBO` | **NONE — activation blocked** | Set to real Paystack amount in kobo |
| Premium duration | `PREMIUM_DURATION_DAYS` | **NONE — activation blocked** | Set to subscription length in days |
| Commission rate | `MARKETPLACE_COMMISSION_RATE` | 0.06 (6%) | Confirm or change |
| Escrow auto-release | `ESCROW_AUTO_RELEASE_ENABLED` | false (DISABLED) | Enable only after trigger decision and Paystack escrow confirmed |
| Escrow release days | `ESCROW_RELEASE_DAYS_AFTER_CONFIRM` | 14 | Confirm trigger (after buyer confirm vs. after order creation) |
| AI review | `AI_REVIEW_ENABLED` | true | Requires `GEMINI_API_KEY` |
| Price range auto-approve | `PRICE_REF_AUTO_APPROVE_ENABLED` | false | Enable only after system is trusted |
| Lower commission for Premium | Not yet configured | Disabled | Set `PREMIUM_LOWER_COMMISSION_RATE` when ready |

---

## Price reference data

The `price_references` table starts empty. **Do not invent prices.**

Before AI listing review can assess prices:
1. An admin or staff member populates price references from verified Nigerian sources (recyclers' price lists, scrap dealers, trade markets).
2. Each range starts as `proposed`.
3. An admin reviews the sources and approves the range in the Admin → Price References screen.
4. Only approved ranges are used for AI review.

Sources must be documented (URL + date accessed). If fewer than `AI_REVIEW_MIN_SOURCES` independent sources exist, confidence is set to `low` and the listing goes to the admin queue instead of being auto-assessed.

---

## Staff account provisioning

There is no public staff registration. To create the first staff account:

```bash
cd backend
python -m app.management create_staff --phone +2348012345678 --name "Staff Name" --password "SecurePassword123!"

# To create an admin:
python -m app.management create_staff --phone +2348012345678 --name "Admin Name" --admin
```

Provision the first admin via direct database access or this command on the server.

---

## Security notes

- `PAYMENT_SECRET_KEY`: Never expose in frontend code, logs, documentation, or a ZIP file.
- `GEMINI_API_KEY`, `RESEND_API_KEY`: Server-side only.
- All staff access is server-side role-checked. The staff URL provides no security — roles do.
- All staff actions are logged in `moderation_logs`.
- Webhook signature is validated with HMAC-SHA512 on every call.
- Premium activation verifies the transaction with Paystack server-side (not just the webhook payload).
- Duplicate payment references are handled idempotently — the same reference can only activate Premium once.

---

## What is NOT implemented yet (requires owner decisions)

- Live escrow with Paystack (requires confirming Paystack supports required escrow behavior)
- Automated refunds (escrow release is manual until trigger is confirmed)
- Push notifications / WhatsApp alerts (notification layer designed for extension)
- PDF completion certificates (roadmap)
- Premium lower commission rate (needs rate configured)
- Bulk CSV upload (needs quota set)
- Collection scheduling (basic version designed, needs enabling)
- Impact report emission factors (owner must supply documented methodology)
