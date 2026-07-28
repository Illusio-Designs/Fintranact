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
- [x] **Verify (compile):** `pnpm install` + `typecheck` **PASS on all 6 workspaces** (types, validation, api, ui, web, desktop). Lockfile committed.
- [ ] **Verify (runtime):** needs MySQL + native `argon2` build (installed with `--ignore-scripts`); then migrate + seed + login end-to-end — **Phase 0 exit**
- [ ] Follow-ups: tenancy middleware (X-Company-Id validation), refresh-token rotation, MFA, signing-PIN endpoints

## Phase 1 — started early: Excel data import (older-data migration)
- [x] Ledger + opening-balance tables (`003_ledgers_import.sql`) as an import target
- [x] Excel import module: parse `.xlsx` (exceljs), **validate (dry run)** vs zod, **commit** valid rows in a transaction, import-batch + per-row audit, downloadable template
- [x] Endpoints: `GET /import/ledgers/template`, `POST /import/ledgers/validate`, `POST /import/ledgers/commit` (multipart, `data:import` permission)
- [x] Generalised import to an **entity registry**: `ledgers`, `items`, `employees` (each with columns/schema/insert/template); entity-generic routes `/import/:entity/{template,validate,commit}` + `/import/entities`
- [x] **Web import screen** (`apps/web/app/import`): entity picker, download template, validate → per-row grid (valid/error), commit
- [x] Field encryption helper (`common/crypto.ts`, AES-256-GCM) — employee **PAN stored encrypted** (`pan_enc`)
- [x] DB `004_items_employees.sql`: items, item_opening_stock, employees
- [ ] Extend to Rate-Master + historical vouchers; background job for large files; import-history view

## Phase 1 — Accounting core (in progress)
- [x] Ledger CRUD API: create (category + multi-address + blacklist), list, get, blacklist toggle — `modules/accounting/ledgers.*`
- [x] **Double-entry voucher engine**: `POST /vouchers` creates & posts a balanced voucher (schema enforces debits==credits), FY-aware **numbering series** with row-locked allocation, header + lines, audited; list + get with lines — `modules/accounting/vouchers.*`
- [x] DB `005_accounting.sql`: ledger_addresses, financial_years, numbering_series, vouchers, voucher_lines + seed FY 2026-27 & series
- [x] **Sales invoice composer** (`modules/sales`): high-level `{party, placeOfSupply, items[{salesLedgerId,taxable,gstRate}]}` → auto-builds the balanced multi-line voucher (Dr party; Cr service a/c; Cr Output CGST+SGST intra / IGST inter). System GST/income ledgers seeded (`006_system_ledgers.sql`, `system_key`). Math verified to balance (intra/inter/multi-item).
- [ ] Purchase invoice composer (mirror: Dr expense + Input GST, Cr supplier; + TDS); web screens for ledger create + voucher/sales pass-entry; period locks; day book/trial-balance; Process/Rate masters CRUD

## Web app — mock mode for Vercel demo
- [x] Decoupled `apps/web` from workspace packages (self-contained) so it deploys standalone
- [x] Mock layer: `lib/mock.ts` (roles/KPIs/vouchers/compliance/import) + `lib/api.ts` (mock by default; real API when `NEXT_PUBLIC_USE_MOCK=false`)
- [x] Pages: `/dashboard` (role-switch KPIs + vouchers + compliance), `/import` (validate grid + commit), `/login` (mock enter); shared `Shell` with demo banner
- [x] **`next build` passes** — 5 static routes; deploy on Vercel with Root Directory=`apps/web`, no env needed
- [ ] Flesh out dashboard widgets to match the HTML mockup; wire more real endpoints when API is hosted

## Web app — dashboard/widgets/icons
- [x] Huge **round nav icons** via the **Hugeicons** dependency (`hugeicons-react`) — distinct icon per module group in a 38px round badge
- [x] **Widgets page live** (`/widgets`): catalog of all 20 dashboard widgets (WIDGETS in mock.ts) with search, group filter (Finance/Compliance/Job Work/Payroll/Audit), size chips, role tags, and Add/Added toggle (mock "on your dashboard" count). Linked from Overview nav.
- [x] **UI Library page** (`/ui`, in the sidebar) — the shared `@fintranact/ui` design-system reference: tokens/colours, typography, buttons, form controls, pills/tags/badges, round Hugeicons, and composite components (KPI tiles, cards + KV rows, data table).
- [ ] Wire "Add" to actually persist per-role dashboard layout; make more module pages real (Ledgers/Vouchers list+form on live API)

## Later phases (see PRD §16)
- Phase 1 (cont.) Masters · Documents
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
- `001_init.sql` (identity/access/audit tables, DECIMAL money, hash-chained audit), `002_seed_rbac.sql` (company RAVI Metal, Rajkot branch, 9 roles, permission catalog + role→perm grants). `migrate.ts` runner + `seed.ts` admin user (argon2).

### 2026-07-28 — Task 6-8: Web, Desktop, UI skeletons
- `apps/web` (Next.js): layout, landing, **working login page** posting to the API.
- `apps/desktop` (Electron): `main.ts` loads web UI, `preload.ts` bridge, NSIS + electron-updater config.
- `packages/ui`: design tokens (black/red/white) + `Button` — first shared component.

**NOTE / next verification:** dependencies not yet installed in this env. Before running, do `pnpm install` at root, create the MySQL DB, `pnpm --filter @fintranact/api migrate`, then `tsx src/db/seed.ts`, then start `api` + `web`. Run `pnpm typecheck` to confirm types across workspaces.

### 2026-07-28 — Task 9: Excel data import (older data)
- PRD: added §5.19 Data Import & Migration (Excel / legacy) — templates, validate-then-commit, opening balances, audited batches.
- `packages/validation`: `ledgerImportRowSchema` (tolerant of messy cells; Dr xor Cr).
- DB `003_ledgers_import.sql`: `ledgers`, `ledger_opening_balances`, `import_batches`, `import_rows` + `data:import` permission (accountant/controller).
- `apps/api/modules/import`: `import.service` (parse xlsx via exceljs, validate, commit-in-tx, template gen) + `import.routes` (template/validate/commit, multipart via multer, `data:import` guard); mounted in `app.ts`. Deps added: exceljs, multer, @types/multer.
- Endpoints + curl usage documented in `apps/api/README.md`.
- Note: introduces a minimal `ledgers` table early (Phase-1 target) so older data has somewhere to land.

### 2026-07-28 — Task 10: Generalise import (items + employees) + web UI
- Refactored `import.service` into an **entity registry** (ledgers/items/employees); routes are now `/import/:entity/...` + `/import/entities`.
- Added `itemImportRowSchema` + `employeeImportRowSchema` (validation pkg); DB `004_items_employees.sql`.
- Employee **PAN encrypted at rest** via new `common/crypto.ts` (AES-256-GCM, key from FIELD_ENCRYPTION_KEY); added `config.fieldKey`.
- Built the **web import page** `/import` (entity picker → template → validate grid → commit).
- API README updated; still TODO: rate-master/vouchers import, big-file background job, import-history screen.

### 2026-07-28 — Task 11: Phase 1 accounting core (ledgers + voucher engine)
- Ledger CRUD (`modules/accounting/ledgers.*`): create with multi-address + blacklist, list/get, blacklist toggle; endpoints `/ledgers`, `/ledgers/:id`, `/ledgers/:id/blacklist`.
- Voucher engine (`modules/accounting/vouchers.*`): `voucherCreateSchema` enforces balanced double-entry; service allocates numbers from `numbering_series` (row-locked), writes header+lines, audits `voucher.post`; `/vouchers` list/get/create.
- DB `005_accounting.sql` + seed FY & series. Mounted routers in `app.ts`.

### 2026-07-28 — Task 12: Install + typecheck (green)
- `pnpm install --ignore-scripts` (skips native argon2/electron builds); built types+validation; **`typecheck` passes on all 6 workspaces**.
- Fixed real type errors surfaced: mysql2 named-param bags typed too widely (`unknown` → concrete), import insert data cast to the zod row types, and the @types/node 22 generic-`Buffer` vs exceljs boundary. Committed `pnpm-lock.yaml`.
- Remaining verification is runtime-only (MySQL + `argon2` native build), noted in Phase 0 checklist.

### 2026-07-28 — Task 13: Sales invoice engine (multi-line GST composition)
- Answered "how a sales voucher posts party + service + GST": added `modules/sales` composer that turns a high-level invoice into the balanced double-entry (Dr party; Cr income a/c; Cr Output CGST/SGST or IGST by place of supply).
- `salesInvoiceSchema` (+ `income`/`tax` ledger categories) in validation; `006_system_ledgers.sql` seeds Output/Input CGST/SGST/IGST + Job Work Charges + Round Off with a `system_key` the composer resolves.
- Endpoint `POST /api/v1/invoices/sales`. Composition verified to balance for intra/inter/multi-item. Typecheck green across workspaces. API README updated.

### 2026-07-28 — Task 14: Web mock mode for Vercel
- Made `apps/web` self-contained (removed @fintranact/* deps + transpilePackages) so it deploys on Vercel alone.
- Added `lib/mock.ts` + `lib/api.ts` (mock ON by default; flips to real API via `NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_API_URL`), a shared `Shell` (dark nav + demo banner), and a real `/dashboard` (role-switch KPIs, recent vouchers, compliance) + updated `/import` and `/login`.
- Fixed Next resolution (dropped `.js` import extensions for bundler). **`pnpm --filter @fintranact/web build` passes** → 5 static routes. Added `apps/web/README.md` (Vercel: Root Directory=apps/web, no env).

### 2026-07-28 — Task 15: Real RAVI Metal logo in web + merge to main
- Added the exact logo from the HTML mockup to `apps/web/public/ravi-logo.gif`; header shows it in a white panel (dark bar), login shows it in a white card; right-side tag now "Powered by Fintranact". Rebuilt web — passes.
- Merged feature branch into `main` and pushed.

### 2026-07-28 — Task 16: Rename client RAVI Metal Treatment → RAVI Metal Treatment (Rajkot)
- Renamed the reference client to **RAVI Metal Treatment**, location **Rajkot, Gujarat**, home GSTIN **24AABCS1429P1Z5** (state 24) across PRD, mockup, web app, seed SQL, Form 16 sample, README, memory. **Left the internal `Ravi Matel` admin module name untouched** (original mandate).
- Replaced the RAVI logo with an **"AJI DEAM · Heat Treatment · Rajkot" wordmark** in the web app and mockup (removed `ravi-logo.gif`); the embedded data-URI logo is gone (mockup shrank ~1.2MB→136KB). A real RAVI Metal Treatment logo can be dropped in later.
- Flipped mockup place-of-supply so **Gujarat = intra-state** (home), Maharashtra = inter-state.
- Regenerated `docs/samples/Form16_sample.pdf` for RAVI Metal Treatment. Web build passes; artifact republished.

### 2026-07-28 — Task 17: Port the HTML mockup look into the web dashboard
- Extracted the mockup's stylesheet → `apps/web/app/globals.css` (loaded in layout); rebuilt `/dashboard` as a faithful React port: dark **sidebar** (AJI DEAM wordmark + collapsible module nav with pages), **topbar** (company switcher · GSTIN · Rajkot, FY + role selects, search, theme toggle, notifications bell, Quick Entry), **KPI tiles** (incl. dark GST accent), **cash-flow chart**, **compliance calendar**, **P&L**, recent vouchers, approvals, and supervisor/payroll cards.
- Role selector swaps KPIs + which cards show; theme toggle (light/dark) and mobile nav drawer wired. Extended `lib/mock.ts` (accountant/compliance/auditor roles + approvals + pending inward/outward).
- **`next build` passes**; verified with a headless screenshot — matches the mockup. Merged to main.

### 2026-07-28 — Task 18: Working sidebar + real logo; company/branch corrected
- **Corrected identity:** company = **RAVI Metal Treatment** (logo restored), branch/unit = **Aji Deam Unit 3, Rajkot (Gujarat, GSTIN 24…)**. Reverted the earlier over-rename (Aji Deam was meant as the branch, not the company).
- **Working sidebar:** extracted the shell into `lib/appshell.tsx` (rail + topbar + content); every nav item now links (Dashboard→/dashboard, Documents→/import, all others→ catch-all `/m/[...slug]`), active item highlights via `usePathname`. Module pages render a titled placeholder ("API ready" note for ledgers/vouchers/sales). Dashboard + Import refactored onto AppShell.
- **Logo** restored (`ravi-logo.gif`) in the sidebar white panel + login; re-embedded in the mockup; regenerated Form 16 for RAVI Metal Treatment / Aji Deam Unit 3. Verified dashboard + `/m/vouchers` via screenshots; build passes; artifact republished.
