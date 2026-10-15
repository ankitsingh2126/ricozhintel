# DEPLOYMENT GUIDE: Ricozhintel Free-Tier Hosting

This document provides step-by-step instructions for deploying Ricozhintel on free-tier platforms without incurring costs.

---

## 1. Architecture Overview for Deployment

```
[ Frontend: Vercel / Netlify ]
      │ (HTTPS REST API calls)
      ▼
[ Backend: Render / Railway / Fly.io ]
      │ (MongoDB Wire Protocol TLS)
      ▼
[ Database: MongoDB Atlas (M0 Free Tier) ]
```

---

## 2. Database: MongoDB Atlas (Free M0 Cluster)

1. **Sign up / Sign in** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Create a Free Cluster:**
   - Select **M0 (Free)**.
   - Choose a cloud provider and region closest to your backend hosting region (e.g., AWS `us-east-1` or `eu-central-1`).
3. **Database Access (User Credentials):**
   - In **Security > Database Access**, click **Add New Database User**.
   - Select **Password Authentication**.
   - Create a user (e.g., `ricozh_admin`) with strong password and assign `Read and write to any database`.
4. **Network Access (IP Whitelist):**
   - In **Security > Network Access**, click **Add IP Address**.
   - For free-tier container platforms with dynamic IPs (Render, Railway), choose **Allow Access From Anywhere** (`0.0.0.0/0`).
5. **Get Connection String:**
   - Go to **Database > Clusters > Connect > Drivers (Node.js)**.
   - Copy connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ricozhintel?retryWrites=true&w=majority
     ```

---

## 3. Backend Deployment (Render Free Web Service)

1. **Sign up / Sign in** at [render.com](https://render.com).
2. **Create New Web Service:**
   - Connect your GitHub repository: `https://github.com/ankitsingh2126/ricozhintel`.
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
3. **Configure Environment Variables in Render:**
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations & error masking |
   | `PORT` | `10000` | Render default (or auto-assigned) |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
   | `CLIENT_ORIGIN` | `https://your-frontend.vercel.app` | Frontend production URL (supports comma-separated origins) |
   | `JWT_SECRET` | `<random-32+-char-secret>` | Required in production (min 32 characters, e.g. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration duration (default `7d`) |
   | `ADMIN_BOOTSTRAP_SECRET` | `<random-secret>` | Optional one-time secret for initial production administrator bootstrap |

4. **Deploy & Verify:**
   - Click **Deploy Web Service**.
   - Once deployed, visit `https://your-service.onrender.com/api/v1/health`.
   - Confirm status reports `"status": "ok"` and `"db": "connected"`.

---

## 4. Frontend Deployment (Vercel)

1. **Sign up / Sign in** at [vercel.com](https://vercel.com).
2. **Import Project:**
   - Select your GitHub repository: `ankitsingh2126/ricozhintel`.
   - Set **Root Directory** to `client`.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
3. **Configure Environment Variables in Vercel:**
   | Variable | Value | Notes |
   |---|---|---|
   | `VITE_API_URL` | `https://ricozhintel-api.onrender.com/api/v1` | URL of your deployed Render backend (supports base domain or `/api/v1`) |
   | `VITE_API_BASE_URL` | `https://ricozhintel-api.onrender.com/api/v1` | Backward-compatible alias for `VITE_API_URL` |
4. **Single-Page Application (SPA) Routing Configuration:**
   - Preconfigured in `client/vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
5. **Deploy:**
   - Click **Deploy**. Vercel will build and assign an HTTPS domain (e.g., `https://ricozhintel.vercel.app`).
   - Copy this domain and update `CLIENT_ORIGIN` in your Render Web Service settings if needed.

---

## 5. Initial Production Administrator Setup (No Seeding Needed)

> [!CAUTION]
> **Do not run `npm run seed` in production.** The seed script resets data and populates hardcoded demo credentials (`admin@ricozhintel.internal` / `Admin123!`), which are strictly for local development and testing.

In production, public registration (`/api/v1/auth/register`) strictly assigns the read-only `viewer` role, and client-supplied `role: "admin"` payloads are rejected with HTTP 400. To safely provision your initial production administrator without exposing privileges to public visitors:

### Option A: Controlled One-Time Bootstrap Endpoint (Recommended for Render)
1. In your Render Dashboard, add an environment variable `ADMIN_BOOTSTRAP_SECRET` set to a strong random secret.
2. Submit a one-time provisioning request:
   ```bash
   curl -X POST https://your-service.onrender.com/api/v1/auth/bootstrap-admin \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Production Admin",
       "email": "admin@yourdomain.com",
       "password": "YourStrongProductionPassword!",
       "bootstrapSecret": "YOUR_ADMIN_BOOTSTRAP_SECRET"
     }'
   ```
3. Once the first administrator is provisioned, this endpoint permanently locks down (returns 403 Forbidden). You can also remove `ADMIN_BOOTSTRAP_SECRET` from your Render settings.

### Option B: Dedicated CLI Provisioning Script
Alternatively, provision an administrator directly using the CLI with your MongoDB connection URI:
```bash
cd server
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ricozhintel" \
  npm run admin:provision -- --email admin@yourdomain.com --password "YourStrongProductionPassword!" --name "Production Admin"
```

### Promoting Subsequent Administrators
Subsequent user registrations through the web interface receive the `viewer` role. An existing administrator can promote or demote users using the authenticated administrative endpoint:
```bash
PATCH /api/v1/auth/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "role": "admin" }
```

---

## 6. Free-Tier Operational Characteristics

- **Render Free Web Service Spindown:**
  - Inactive containers spin down after 15 minutes of inactivity.
  - The first request after spindown (cold start) will take 30–50 seconds while the instance initializes.
  - Once active, API responses return within milliseconds.
- **MongoDB Atlas Shared M0 Cluster:**
  - 512 MB storage limit, shared RAM/vCPU.
  - Requires Network Access set to `0.0.0.0/0` (Allow Access from Anywhere) because Render free tier uses dynamic egress IPs. Access is secured by your database user password and TLS.
- **Vercel Hobby Tier:**
  - Global edge CDN deployment with automatic HTTPS certificates and zero cold-start delay.

---

## 7. Pre-Flight Verification Checklist

- [ ] Backend `/api/v1/health` returns `HTTP 200` with `db: "connected"` and `status: "ok"`.
- [ ] Render environment variables include `JWT_SECRET` (≥32 chars), `NODE_ENV=production`, `MONGODB_URI`, `CLIENT_ORIGIN`.
- [ ] Vercel environment variables include `VITE_API_URL` (or `VITE_API_BASE_URL`) pointing to `https://ricozhintel-api.onrender.com/api/v1`.
- [ ] CORS is configured with the exact Vercel frontend URL.
- [ ] Initial production admin created via `/api/v1/auth/bootstrap-admin` or CLI provisioning script with a private, strong password.
- [ ] No `.env` credentials are committed in Git history.
- [ ] Rate limiter permits ordinary usage (120 req/min per IP, with `trust proxy` enabled).
