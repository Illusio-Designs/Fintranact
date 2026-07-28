# @fintranact/web

Next.js web app. **Self-contained** (no workspace deps) and **mock-mode by
default**, so it displays with no backend — ideal for a Vercel demo.

## Local
```bash
pnpm --filter @fintranact/web dev     # http://localhost:3000  (mock data)
```
Routes: `/dashboard` (role-switch KPIs, vouchers, compliance), `/import`
(Excel import flow), `/login`.

## Deploy to Vercel (mock demo)
1. Import the repo in Vercel.
2. Set **Root Directory = `apps/web`** (Framework auto-detects **Next.js**).
3. Deploy — no env vars needed. Mock mode is ON by default, so the dashboard
   and import screens render with canned data.

## Point it at the live API
Set env vars in Vercel (or `.env.local`):
```
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://your-api-host
```
Then login/import/dashboard call the real `@fintranact/api`.
