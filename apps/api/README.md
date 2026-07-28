# @fintranact/api

Node.js + TypeScript backend (Express, modular monolith). Phase 0 foundation:
IAM (login, session), RBAC + tenancy, hash-chained audit log, health.

## Run
```bash
cp .env.example .env          # set DB creds + JWT_SECRET
# create the MySQL database named in DB_NAME first, then:
pnpm --filter @fintranact/api migrate    # apply db/migrations/*.sql
pnpm --filter @fintranact/api exec tsx src/db/seed.ts   # create admin user
pnpm --filter @fintranact/api dev        # http://localhost:4000
```

## Endpoints (v1)
- `GET  /health` — liveness + DB ping
- `POST /api/v1/auth/login` — `{ email, password }` → `{ accessToken, session }`
- `GET  /api/v1/auth/me` — current session (Bearer token)

## Structure
```
src/
  main.ts            entrypoint
  app.ts             express app assembly
  config.ts          env config
  common/            db, logger, errors, http, audit, context
    middleware/      requestId, auth, rbac, errorHandler
  modules/
    iam/             auth: repo, service, routes
  db/
    migrate.ts       forward-only migration runner
    seed.ts          dev admin seed
db/migrations/       001_init.sql, 002_seed_rbac.sql
```

Authorization is enforced **server-side** on every request (`requireAuth` +
`requirePermission`). The web and desktop apps are clients only.
