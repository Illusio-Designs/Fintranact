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
- `GET  /api/v1/import/entities` — list importable entities (`ledgers`, `items`, `employees`)
- `GET  /api/v1/import/:entity/template` — download the .xlsx template
- `POST /api/v1/import/:entity/validate` — multipart `file` → per-row validation (dry run, no writes)
- `POST /api/v1/import/:entity/commit` — multipart `file` + `financialYear` → import valid rows

### Import older data from Excel (quick try)
```bash
TOKEN=... # from /auth/login
curl -H "Authorization: Bearer $TOKEN" -OJ http://localhost:4000/api/v1/import/ledgers/template
# fill the template, then (any entity: ledgers | items | employees):
curl -H "Authorization: Bearer $TOKEN" -F file=@ledgers.xlsx \
     http://localhost:4000/api/v1/import/ledgers/validate         # check first
curl -H "Authorization: Bearer $TOKEN" -F file=@ledgers.xlsx -F financialYear=2025-26 \
     http://localhost:4000/api/v1/import/ledgers/commit           # then import
```
Or use the web UI at **`/import`** (upload → per-row grid → commit).

## Vouchers & sales invoice
- `POST /api/v1/vouchers` — post a balanced voucher `{ type, date, lines:[{ledgerId,drCr,amount}] }` (debits must equal credits)
- `GET  /api/v1/vouchers` / `GET /api/v1/vouchers/:id` — list / header+lines
- `POST /api/v1/invoices/sales` — high-level sales invoice; the server **auto-composes** the multi-line GST voucher:
  ```
  { partyLedgerId, placeOfSupply: "intra"|"inter", date,
    items: [{ salesLedgerId, taxable, gstRate }] }
  →  Dr Party (total)
     Cr Service/income account (taxable)
     Cr Output CGST + SGST (intra)  OR  Cr Output IGST (inter)
  ```
- `GET/POST /api/v1/ledgers`, `POST /api/v1/ledgers/:id/blacklist`

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
