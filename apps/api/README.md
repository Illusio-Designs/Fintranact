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
- `GET  /api/v1/import/ledgers/template` — download the .xlsx import template
- `POST /api/v1/import/ledgers/validate` — multipart `file` → per-row validation (dry run, no writes)
- `POST /api/v1/import/ledgers/commit` — multipart `file` + `financialYear` → import valid rows (ledgers + opening balances)

### Import older data from Excel (quick try)
```bash
TOKEN=... # from /auth/login
curl -H "Authorization: Bearer $TOKEN" -OJ http://localhost:4000/api/v1/import/ledgers/template
# fill the template, then:
curl -H "Authorization: Bearer $TOKEN" -F file=@ledgers.xlsx \
     http://localhost:4000/api/v1/import/ledgers/validate         # check first
curl -H "Authorization: Bearer $TOKEN" -F file=@ledgers.xlsx -F financialYear=2025-26 \
     http://localhost:4000/api/v1/import/ledgers/commit           # then import
```

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
