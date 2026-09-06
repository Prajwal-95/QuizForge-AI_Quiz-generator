# Deploying QuizForge AI to the Cloud

**Recommended: Render.com with the included `render.yaml` blueprint.**
It's the fastest, easiest path — two services (backend + frontend) defined in one
file. After you push to GitHub, deployment is basically one click.

Already handled for you:

- `render.yaml` at the repo root defines both services (FastAPI + Vite static).
- `frontend/src/api.ts` auto-adds `/api` to `VITE_API_BASE` and keeps local dev
  (`localhost:5173 → :8001`) unchanged.
- `backend/Dockerfile` respects the `PORT` env var that Render injects.
- CORS is already wide open (`allow_origins=["*"]`).

---

## ✅ Fastest path — Render Blueprint (2 steps)

### 1. Push the project to GitHub

```powershell
cd "f:\AI-Quiz genarator"
git init
git add .
git commit -m "deploy: add Render blueprint (backend + frontend)"
git remote add origin https://github.com/<your-username>/quizforge.git
git push -u origin main
```

> `.gitignore` already excludes `venv/`, `node_modules/`, `dist/`, `.env`, `*.db`.

### 2. Create the blueprint on Render

1. Sign in at https://render.com (free account is fine).
2. Click **New** → **Blueprint**.
3. Connect your GitHub repo and select it.
4. Render reads `render.yaml` and shows both services:
   - `quizforge-api` — backend (Docker + FastAPI)
   - `quizforge` — frontend (static build)
5. Click **Apply** → wait ~5 minutes.

**You're live:**
- Frontend → `https://quizforge.onrender.com`
- Backend → `https://quizforge-api.onrender.com`
- API docs → `https://quizforge-api.onrender.com/docs`

### Post-deploy (optional but recommended)

In the `quizforge-api` service → **Environment**:

- `GROQ_API_KEY` — add your Groq key if you want real LLM quiz generation
  (leave empty for demo mode).
- `JWT_SECRET` — Render already generated a random one.

---

## Old manual dashboard method (if you prefer clicking)

If you'd rather not use the blueprint, the manual steps are below — the result is
the same.

---

## Option A — Render.com (recommended)

Render gives you a free **Static Site** for the React build and a free **Web Service**
for the FastAPI backend, plus you can attach a persistent Disk if you want the
SQLite data to survive redeploys.

### 1. Push your project to GitHub

The repo must be public or connected to Render via a GitHub account.

```powershell
cd "f:\AI-Quiz genarator"
git init
git add .
git commit -m "deploy: ready for Render (VITE_API_BASE + PORT support)"
git remote add origin https://github.com/<your-username>/quizforge.git
git push -u origin main
```

> Make sure `.gitignore` excludes `node_modules`, `venv`, `.env`, and the SQLite
> database file before pushing.

### 2. Deploy the backend

1. Go to https://render.com → **New → Web Service**.
2. Connect your GitHub repo, select it.
3. **Root directory**: `backend`
4. **Environment**: `Docker`
5. **Name**: `quizforge-api`
6. Click **Create Web Service**. Render will build the Docker image and start it.

### 3. Set backend environment variables

In the Web Service → **Environment**, add:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | your Groq API key (leave empty to use demo mode) |
| `JWT_SECRET` | a long random string — type/123456 changed, generate one |

Render injects `PORT` automatically; the Dockerfile picks it up.

> **SQLite persistence:** Render's free tier does **not** keep files between
> redeploys. To persist your users and quizzes, add a **Disk** (Instances →
> Disks) mounted at `/app`, then in Environment set
> `DATABASE_URL=sqlite:////app/quizforge.db`.

### 4. Deploy the frontend

1. https://render.com → **New → Static Site**.
2. Connect the same GitHub repo.
3. **Root directory**: `frontend`
4. **Build command**: `npm install && npm run build`
5. **Publish directory**: `dist`
6. **Environment variable** (available during build):
   - `VITE_API_BASE` = `https://<your-backend-name>.onrender.com/api`
     (use your actual backend URL, e.g. `https://quizforge-api.onrender.com/api`)
7. Click **Create Static Site**. It builds and serves your app over HTTPS.

### 5. Done 🎉

- Frontend: `https://<your-app>.onrender.com`
- Backend API docs: `https://quizforge-api.onrender.com/docs`

---

## Option B — Railway (alternative)

Railway runs behind a single custom domain per service and gives you a volume to
persist SQLite.

### Backend

1. https://railway.app → **New Project** → **Deploy from GitHub repo**.
2. Select the repo root (Railway auto-detects the `backend/Dockerfile`); or add a
   new **Dockerfile** service and point it at `backend`.
3. Set variables: `GROQ_API_KEY`, `JWT_SECRET`.
4. Add a **Volume** mounted at `/app`, and set
   `DATABASE_URL=sqlite:////app/quizforge.db`.
5. Railway gives the service a public URL like `https://quizforge-api.up.railway.app`.

### Frontend

1. Add another service → **Static / frontend** (or a service that runs
   `npm run build` and serves `dist`).
2. Set build-time variable `VITE_API_BASE=https://quizforge-api.up.railway.app/api`.
3. For a static site on Railway you can host `dist/` on **Netlify** or **Cloudflare
   Pages** instead — both are free and just need a build command of
   `npm run build` with publish directory `dist`.

---

## Free-tier notes (both platforms)

- **Sleeping instances**: free web services spin down after ~15 minutes of
  inactivity. The first request after idle takes ~30–50s to wake up.
- **Ephemeral disk**: on free tiers without a mounted volume, SQLite data is lost
  when the service is redeployed. Mount a persistent volume/disk for real data.
- **LLM key**: without `GROQ_API_KEY` the quiz generator falls back to demo mode
  (local question-bank generation).

---

## Keeping the free backend awake (recommended)

Render's free tier spins the `quizforge-api` service down after ~15 minutes of
idle. The first request after a cold start returns **HTTP 503 for 30–50s**,
which shows up in the app as **"Failed to fetch"** on sign-in and a **"Demo
mode"** badge while the health check fails. (The backend itself is fine — it
just needs to be woken up.)

The reliable fix is an **externally-hosted uptime monitor** that hits the
backend every few minutes so it never idles out. The backend health endpoint is
cheap and CORS is open, so this is safe:

> Monitor target: `https://quizforge-api-ntm4.onrender.com/api/health`

### Option 1 — UptimeRobot (recommended, free, 50 monitors)

1. Create a free account at https://uptimerobot.com
2. **Add New Monitor** → type **HTTP(s)**.
3. **URL (or IP)**: `https://quizforge-api-ntm4.onrender.com/api/health`
4. **Monitoring interval**: `5 minutes` (free-tier minimum).
5. Leave **HTTP method** as GET and **(Optional) alert contacts** empty for now.
6. **Create monitor**.

UptimeRobot pings every 5 min, so the service never drops below Render's
~15-min idle threshold. Downtime alerts are expected during things like manual
redeploys — you can silence these by wrapping the periodic pings in a
**Maintenance Window** (UptimeRobot → Modify → Maintenance window → Daily) so
alerts don't spam you.

> The same monitor on the **frontend** URL
> (`https://quizforge-jybu.onrender.com`) keeps the static app warm too, though a
> static nginx site doesn't cold-start the same way.

### Option 2 — cron-job.org (free, no alerts by default)

1. Create a free account at https://cron-job.org
2. **Create cronjob** → name it `QuizForge keep-alive`.
3. **URL**: `https://quizforge-api-ntm4.onrender.com/api/health`
4. **Schedule**: every 5 minutes (e.g. `*/5 * * * *`).
5. Save. It pings on schedule so the backend stays awake.

> **Note:** Render free instances can still restart on deploys or platform
> maintenance; a pinger keeps them warm but isn't a 100% uptime guarantee. For
> guaranteed-always-on, upgrade the backend service to Render **Starter**
> ($7/mo) — the frontend static site is effectively free either way.

---

## Verify a deployment

- Open the deployed frontend URL → the login/dashboard should load.
- Open `https://<backend-url>/api/health` → expect `{"status": "ok", ...}`.
- Register a user and create a quiz to confirm the frontend ↔ backend link
  (the network tab in DevTools should show `200` on `/api/auth/*` calls).