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
   | `CLIENT_ORIGIN` | `https://your-frontend.vercel.app` | Frontend production URL |
4. **Deploy & Verify:**
   - Click **Deploy Web Service**.
   - Once deployed, visit `https://your-service.onrender.com/api/v1/health`.
   - Confirm status reports `"status": "ok"` and `"database": "connected"`.

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
   | `VITE_API_BASE_URL` | `https://your-service.onrender.com/api/v1` | URL of your deployed Render backend |
4. **Single-Page Application (SPA) Routing Configuration:**
   - Create `client/vercel.json` if direct route navigation (e.g., `/departments/123`) returns 404:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
5. **Deploy:**
   - Click **Deploy**. Vercel will build and assign an HTTPS domain.

---

## 5. Seed Initial Data (Optional)

To seed initial demo departments and KPIs into MongoDB Atlas from your local terminal:
```powershell
cd server
$env:MONGODB_URI = "mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ricozhintel?retryWrites=true&w=majority"
npm run seed
```

---

## 6. Pre-Flight Verification Checklist

- [ ] Backend `/api/v1/health` returns `HTTP 200` with `database: connected`.
- [ ] CORS is configured with the exact Vercel frontend URL.
- [ ] No `.env` credentials are committed in Git history.
- [ ] Rate limiter permits ordinary usage (120 req/min per IP).
- [ ] KPI creation and achievement calculations function end-to-end.
