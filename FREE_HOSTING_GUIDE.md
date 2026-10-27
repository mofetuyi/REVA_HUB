# 🚀 100% Free Hosting Guide for Reva Hub

This guide shows you the easiest, **completely free ($0/month, no credit card required)** way to host both the **Frontend** and **Backend** together.

---

## 🏆 Top Recommendation: Render (App) + Neon (PostgreSQL Database)

With Reva Hub's built-in unified architecture, **Render** builds both the React Vite frontend and runs the FastAPI backend on **one single URL** (e.g., `https://reva-hub.onrender.com`). 

Because Render's internal free PostgreSQL expires after 30 days, we pair it with **Neon.tech**, which provides a **Free Forever PostgreSQL database** with no credit card required.

---

### Step 1: Create Your Free Forever Database on Neon (2 minutes)
1. Go to [neon.tech](https://neon.tech) and sign up with your Google or GitHub account (No credit card required).
2. Click **Create Project**, name it `reva-hub-db`, and choose **Frankfurt (EU)** or the closest region to West Africa.
3. Once created, copy the connection string under **Connection Details**:
   - It looks like: `postgresql://username:password@ep-sample-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Change the prefix from `postgresql://` to `postgresql+asyncpg://`:
   - Example: `postgresql+asyncpg://username:password@ep-sample-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   *(This takes 10 seconds and makes it compatible with FastAPI's async engine).*

---

### Step 2: Push Your Project to GitHub (2 minutes)
1. Create a free account on [github.com](https://github.com) if you haven't already.
2. Create a new repository named `reva-hub`.
3. In your project directory:
   ```bash
   git init
   git add .
   git commit -m "Initial Reva Hub fullstack release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/reva-hub.git
   git push -u origin main
   ```

---

### Step 3: Deploy on Render for Free (3 minutes)
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your `reva-hub` repository.
4. Fill in these settings:
   - **Name**: `reva-hub`
   - **Region**: Frankfurt (EU Central)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Select **Free** ($0.00/mo).
5. Scroll down to **Environment Variables** and add:
   - `ENVIRONMENT`: `production`
   - `SECRET_KEY`: *(click generate or type any secret string)*
   - `DATABASE_URL`: *(paste the `postgresql+asyncpg://...` Neon connection string from Step 1)*
   - `FRONTEND_DIST`: `/opt/render/project/src/frontend/dist`
6. Click **Deploy Web Service**!
7. Within 3-4 minutes, your live site will be online at:
   `https://reva-hub.onrender.com`

---

## ⚡ The "Never Sleep" Free Trick (Keep It Fast 24/7)
Free web services on Render go to sleep after 15 minutes of inactivity (taking 30 seconds to wake up on the next visit).

**To keep your site awake 24/7 for free:**
1. Go to [cron-job.org](https://cron-job.org) (100% free forever, no card).
2. Create a new cron job.
3. URL: `https://reva-hub.onrender.com/health`
4. Schedule: Every **10 minutes**.
5. Save! Now your backend and frontend will stay hot and respond instantly every time.

---

## 🥈 Alternative Option: Koyeb (koyeb.com)
If you prefer an alternative to Render:
- **Koyeb** offers an **Eco Nano** service (2 vCPU, 512MB RAM) completely free forever with no credit card required.
- Connect your GitHub repo, set the build and start commands, add the Neon `DATABASE_URL`, and deploy.

---

## 🥉 Alternative Option: Two-Tier (Vercel + Render)
If you want instant static delivery for the frontend:
- **Vercel** (`vercel.com`): Deploy the `frontend/` folder for free (never sleeps, ultra-fast CDN).
- **Render** (`render.com`): Deploy the `backend/` folder for free.
- Set `VITE_API_BASE_URL` in Vercel to your Render backend URL.
