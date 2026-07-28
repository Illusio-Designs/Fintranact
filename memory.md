# Fintranact — Build Memory & Progress Log

> Living log of development against `docs/PRD.md`. **Updated on every task completed.**
> Product: Fintranact — Indian accounting / GST-TDS-TCS / job-work / payroll platform for **RAVI Metal Treatment** (job-work / heat-treatment processing house).
> Branch: `claude/indian-accounting-platform-prd-fv3jee`

---

## How this file is used
- Every completed task appends an entry under **Task Log** (newest at bottom) with date, what changed, and files touched.
- The **Phase checklist** reflects current state (`[ ]` todo, `[~]` in progress, `[x]` done).
- **Decisions & assumptions** captures anything future work depends on.

## Tech stack (per PRD §1.4)
- Backend: **Node.js + TypeScript** (Express, modular monolith), **MySQL 8**, Redis (later), object storage (later).
- Web: **Next.js** (App Router, TS).
- Desktop: **Windows app via Electron** (reuses shared UI + same APIs; device bridge + offline — later phases).
- Shared: **`@fintranact/ui`** component library, `@fintranact/types`, `@fintranact/validation` (zod).
- Monorepo: npm/pnpm workspaces + Turborepo.

---

## Phase 0 — Foundation (in progress)
Goal: login on web + Windows, RBAC enforced server-side, every action audit-logged.

- [x] Monorepo workspace setup (root `package.json` workspaces, `tsconfig.base.json`, `.gitignore`, `turbo.json`, `pnpm-workspace.yaml`, README)
- [x] Shared packages: `@fintranact/types`, `@fintranact/validation` (zod incl. GSTIN/PAN/FY/PIN + ledger schema)
- [x] Backend `apps/api` foundation: config, logger (pino), MySQL pool, errors, http envelope, request-id, health
- [x] IAM module: users/roles/permissions, login (argon2), `me`, JWT access token
- [x] RBAC + auth middleware (server-side enforcement; `requireAuth` + `requirePermission`)
- [x] Audit-log service (hash-chained, per-company) scaffold
- [x] DB migrations `001_init` (companies, branches, users, roles, permissions, user_company_roles, sessions, audit_logs) + `002_seed_rbac` (RAVI Metal + 9 roles + perms) + migration runner + dev seed
- [x] Web `apps/web` Next.js skeleton (layout, landing, working login page → API)
- [x] Desktop `apps/desktop` Electron skeleton (loads web UI, preload bridge, NSIS/auto-update config)
- [x] `packages/ui` shared UI skeleton (design tokens + Button)
- [ ] `session-start-hook` + `CLAUDE.md` (via `init`)
- [ ] **Verify:** `pnpm install` → `typecheck`/`build` on all workspaces (not yet run in this env — needs install)
- [ ] Wire login end-to-end against a running MySQL (migrate + seed + login) — **Phase 0 exit**
- [ ] Follow-ups: tenancy middleware (X-Company-Id validation), refresh-token rotation, MFA, signing-PIN endpoints

## Later phases (see PRD §16)
- Phase 1 Accounting core · Masters · Documents
- Phase 2 GST · Invoicing · e-Invoice/e-Way
- Phase 3 TDS/TCS · Job Work · Lien · Inventory
- Phase 4 Payroll · Biometric · Form 16
- Phase 5 Reports · Role dashboards · Approvals · Hardening → GA

---

## Decisions & assumptions
- Backend framework: **Express + TypeScript** (simple, universal). Fastify considered; can swap behind the module boundaries.
- Password hashing: **argon2** (fallback bcrypt) per PRD §7.1.
- Money type: `DECIMAL(19,4)` in MySQL; never floats.
- Every business table carries `company_id` (+ `branch_id` where relevant), `created_by/at`, `updated_by/at`, soft-delete where applicable.
- Financial postings are append-only (corrections via reversing entries).
- Package manager: **pnpm** workspaces (npm-compatible layout). Run `pnpm install` at root before running any app.

## How to run (once dependencies installed)
```bash
pnpm install                 # from repo root
pnpm --filter @fintranact/api dev      # backend on :4000
pnpm --filter @fintranact/web dev      # web on :3000
pnpm --filter @fintranact/desktop dev  # Electron shell
```
(MySQL: set `apps/api/.env` from `.env.example`, then run migrations — see apps/api/README.)

---

## Task Log
### 2026-07-28 — Task 1: Init build memory
- Created `memory.md` (this file) with Phase 0 checklist and process.

### 2026-07-28 — Task 2: Monorepo workspace
- Root `package.json` (pnpm workspaces `apps/*`,`packages/*`), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict, NodeNext), `turbo.json`, updated `.gitignore`, new `README.md`.

### 2026-07-28 — Task 3: Shared packages
- `@fintranact/types` — Company/Branch/User/Role, SessionContext, API envelope.
- `@fintranact/validation` — zod schemas: GSTIN, PAN, FY, money, login, signing PIN, ledger (category/multi-address/blacklist).

### 2026-07-28 — Task 4: Backend foundation (apps/api)
- Express + TS app: `config`, `logger`(pino), `db`(mysql2 pool + tx helper), `errors`, `http`(asyncHandler/envelope), `context`(Request augmentation), `audit`(hash-chained).
- Middleware: `requestId`, `requireAuth`(JWT), `requirePermission`(RBAC), `errorHandler`(zod+AppError).
- IAM: `iam.repo`/`iam.service`(argon2 login → JWT)/`iam.routes`(`/auth/login`,`/auth/me`); `app.ts`, `main.ts`.

### 2026-07-28 — Task 5: DB migrations
- `001_init.sql` (identity/access/audit tables, DECIMAL money, hash-chained audit), `002_seed_rbac.sql` (company RAVI Metal, Pune branch, 9 roles, permission catalog + role→perm grants). `migrate.ts` runner + `seed.ts` admin user (argon2).

### 2026-07-28 — Task 6-8: Web, Desktop, UI skeletons
- `apps/web` (Next.js): layout, landing, **working login page** posting to the API.
- `apps/desktop` (Electron): `main.ts` loads web UI, `preload.ts` bridge, NSIS + electron-updater config.
- `packages/ui`: design tokens (black/red/white) + `Button` — first shared component.

**NOTE / next verification:** dependencies not yet installed in this env. Before running, do `pnpm install` at root, create the MySQL DB, `pnpm --filter @fintranact/api migrate`, then `tsx src/db/seed.ts`, then start `api` + `web`. Run `pnpm typecheck` to confirm types across workspaces.
