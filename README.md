# Reva Hub — Circular Economy & Recovered Materials Marketplace

**Reva Hub** is a secure, responsive digital circular-economy marketplace designed for Lagos, Nigeria. It connects households and businesses that have reusable or recyclable materials (plastics, fabrics, wood, cardboard, scrap) with artisans, manufacturers, recyclers, and upcycling entrepreneurs.

---

## Architecture Overview

- **Backend**: FastAPI (Python 3.11), SQLAlchemy (Async), PostgreSQL, Redis, Alembic migrations, Background worker (ARQ).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router v6.
- **AI Engine**: Google Gemini (Server-side only for automated listing compliance review and circular chat).
- **Payment & Escrow Integration**: Paystack hosted Payment Pages & signed webhook automation.
- **Trust & Compliance**: Comprehensive Trust, Safety & Acceptable Use Policy, community reporting, structured enforcement actions, and immutable moderation audit logging.

---

## Key Platform Features

### 1. Reva ID & Reva Hub Premium Payment Activation
- Every user is assigned a stable unique identifier in the format `REVA-<UUID_UPPERCASE>`.
- Users activate or extend **Reva Hub Premium** via the hosted Paystack Payment Page: [https://paystack.shop/pay/reva](https://paystack.shop/pay/reva).
- The Paystack Payment Page collects the user's ID via a custom field named **`REVA ID number`**.
- Incoming webhooks (`/webhooks/payment`) are validated via HMAC-SHA512, verified server-side with Paystack, checked against the configured subscription amount (`PREMIUM_AMOUNT_KOBO`), and processed idempotently per payment reference.
- **Safety Guard**: If `PREMIUM_AMOUNT_KOBO` or `PREMIUM_DURATION_DAYS` is unconfigured, Premium activation is blocked to prevent accidental unintended activations.

### 2. User Compliance (Trust, Safety and Acceptable Use)
- **Mandatory User Agreement**: Required checkbox during registration linking to Terms of Service (Draft), Privacy Policy (Draft), and Trust & Safety Policy.
- **Prohibited Activities**: Strict bans on hazardous waste (chemicals, batteries), medical waste, stolen goods, and platform fraud.
- **Enforcement Levels**:
  1. Warning
  2. Content removal / temporary restriction
  3. Account suspension or termination
  4. Urgent protective action & law enforcement referral
- **Community Reporting**: Reusable `ReportButton` component on listings, user profiles, and Learn tutorials.
- **Right to Human Appeal**: Users can submit appeals against moderation restrictions.

### 3. AI Listing Review & Benchmark Price Checking
- Submitted material listings are marked `pending_review` while an automated background task checks text and pricing against Nigerian market benchmarks.
- **Prompt Injection Defense**: Untrusted listing text is treated strictly as data; the system prompt explicitly forbids executing instructions contained within listings.
- **Safe Fallback**: Any API error, timeout, or schema failure defaults to `needs_review` for human admin moderation.
- **Benchmark Price Ranges (`price_references`)**: Real Nigerian scrap/recycler benchmark ranges (NGN) are curated by admins. Only `approved` ranges are used by the AI review system.

### 4. Discreet Staff Portal & Webhook Management
- Separate, discreet **Staff Login** at `/staff/login` with strict server-side role authorization (`is_staff` or `is_admin`).
- **Staff Operations Dashboard** (`/staff/dashboard`):
  - Save and display the platform's public Paystack webhook URL (`https://YOUR_DOMAIN/webhooks/payment`).
  - Clear guidance on registering the webhook URL in the Paystack Dashboard.
  - Integration health matrix (Payment, AI, SMS, Email, Storage, KYC).
  - No secret keys are ever exposed in client interfaces.

---

## Free Single-Website Deployment (With Custom Domain)

You can host both the frontend and backend on a **single domain** for free using **Render** + **Neon PostgreSQL** + **Upstash Redis**:

1. **Free Managed Database & Redis**:
   - Create a free PostgreSQL database at [Neon.tech](https://neon.tech) (copy the connection string).
   - Create a free Redis instance at [Upstash.com](https://upstash.com) (copy the `rediss://...` URL).

2. **Render Web Service (Single Service for Frontend + Backend)**:
   - Push your code to a GitHub or GitLab repository.
   - On [Render.com](https://render.com), click **New +** → **Web Service** and connect your repo.
   - **Environment**: `Python`
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Environment Variables**: Add your `DATABASE_URL` (change `postgres://` to `postgresql+asyncpg://`), `REDIS_URL`, `SECRET_KEY`, `PAYMENT_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET`, `GEMINI_API_KEY`, etc.
   - Set `ALLOWED_ORIGINS` to `https://yourdomain.com,https://www.yourdomain.com`.

3. **Connecting Your Custom Domain**:
   - In Render, navigate to **Settings** → **Custom Domains**.
   - Add `yourdomain.com` and `www.yourdomain.com`.
   - In your domain registrar's DNS settings (Namecheap, GoDaddy, Cloudflare, etc.):
     - Add a **CNAME** record pointing `www` to your Render service URL (e.g. `reva-hub.onrender.com`).
     - Add an **ANAME** or **A** record for the root domain as indicated by Render.
   - Render automatically provisions a free SSL certificate!
   - Now both your frontend UI and backend API run together seamlessly on your custom domain without CORS issues.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and supply your credentials:

```bash
# Backend Application
ENVIRONMENT=development
SECRET_KEY=generate-a-secure-secret-key-for-jwt
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql+asyncpg://reva:reva_dev_password@localhost:5432/reva_db
REDIS_URL=redis://localhost:6379

# Paystack Payment & Webhook
PAYMENT_SECRET_KEY=sk_live_...         # Server-side ONLY
PAYMENT_WEBHOOK_SECRET=...             # Paystack webhook signature secret
PREMIUM_PAGE_URL=https://paystack.shop/pay/reva
PREMIUM_REVA_ID_FIELD=REVA ID number
PREMIUM_AMOUNT_KOBO=500000             # Example: ₦5,000 (Owner must configure)
PREMIUM_DURATION_DAYS=365              # Subscription duration (Owner must configure)

# AI & Communications
GEMINI_API_KEY=...                     # Server-side ONLY for AI review & chat
RESEND_API_KEY=...                     # Server-side ONLY for transactional emails
SMS_API_KEY=...                        # Termii or Africa's Talking

# Business Rules
MARKETPLACE_COMMISSION_RATE=0.06       # Default 6% (Configurable 5–8%)
ESCROW_AUTO_RELEASE_ENABLED=false      # Intentionally disabled until final trigger sign-off
```

---

## Provisioning the First Staff Account

Staff registration is intentionally disabled on public forms. To provision the initial staff or admin account, run:

```bash
cd backend
python -m app.management create_staff --phone +2348012345678 --name "Staff Member" --password "SecurePassword123!" --admin
```

To generate stable Reva IDs for any existing user accounts:
```bash
python -m app.management backfill_reva_ids
```

---

## Database Migrations

Apply Alembic migrations to create all database tables:
```bash
cd backend
alembic upgrade head
```

---

## Running with Docker Compose (Local Dev)

To run PostgreSQL, Redis, the FastAPI backend, and the ARQ worker together:
```bash
docker-compose up -d
```
