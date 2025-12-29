# Deploy Guide (Docker + Vercel split + Render backend + Pages)

## Local (Docker)

```bash
cd crick6-stack
cp .env.example.example .env
docker compose up -d --build
```

- Public: http://localhost:8081/
- Admin:  http://localhost:8082/admin/login

## Render (Backend)

Create a Render **Web Service** from this repo.

- Root Directory: `crick6-stack/backend`
- Build Command: `npm install --omit=dev`
- Start Command: `node src/index.js`

### Required env vars
- `NODE_ENV=production`
- `DATA_DIR=/data`
- `JWT_SECRET=...` (strong)
- `ADMIN_USER=admin`
- `ADMIN_PASS=...` (strong)
- `PUBLIC_BASE_URL=https://YOUR_PUBLIC_FRONTEND_DOMAIN`

### Persistent disk
Add a disk mounted at `/data`.

## Vercel (Two separate projects)

Create **two** Vercel projects pointing to the same folder:

- Root Directory: `crick6-stack/frontend`

### Public Vercel project env vars
- `VITE_APP_MODE=public`
- `BACKEND_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com`
- `VITE_SITE_NAME=...` (optional)
- `VITE_BRAND_NAME=...` (optional)

### Admin Vercel project env vars
- `VITE_APP_MODE=admin`
- `BACKEND_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com`
- `VITE_SITE_NAME=...`
- `VITE_BRAND_NAME=...`

Notes:
- `/api/*` is proxied by Vercel Serverless Functions in `frontend/api/*`.
- `/uploads/*` is rewritten to `/api/uploads/*` in `frontend/vercel.json`.

## GitHub Pages / GitLab Pages (Static only)

Pages cannot proxy `/api` like Vercel, so the frontend must call Render directly.

### Recommended: Pages for PUBLIC site only
Build with:
- `VITE_APP_MODE=public`
- `VITE_API_BASE=https://YOUR-RENDER-SERVICE.onrender.com`
- `VITE_BASE=/<repo-name>/` (GitHub Pages) OR `VITE_BASE=/<project-path>/` (GitLab Pages)

Backend for Pages (optional):
- set `CORS_ORIGINS` to allow your Pages origin(s), comma-separated
- if you need cookies cross-site (not recommended), set:
  - `COOKIE_SAMESITE=none`
  - `COOKIE_SECURE=true`

⚠️ Admin auth uses cookies; cross-site cookies may be blocked by browsers. Use Vercel for admin.
