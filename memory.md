# Fintranact — Build Memory & Progress Log

> Living log of development against `docs/PRD.md`. **Updated on every task completed.**
> Product: Fintranact — Indian accounting / GST-TDS-TCS / job-work / payroll platform for **RAVI Metal Treatment** (job-work / heat-treatment processing house).
> Branch: `claude/indian-accounting-platform-prd-fv3jee`

---

## ⚠️ MANDATORY RULE — UI library is compulsory for every page
**Every page/screen MUST be built from the shared `@fintranact/ui` design system. No bespoke/inline styling or ad-hoc colours.**
- Use the design tokens + component classes in `apps/web/app/globals.css` (`.card`, `.field`, `.ctl`, `.btn`, `.pill`, `.alert`, `.dropzone`, `.toolbar`, `.dd`, `.cal`, table styles, …) — never hardcoded hex or one-off inline CSS for structure/colour.
- Compose from the shared React components: `AppShell` (`lib/appshell.tsx`) for every in-app page, and `Dropdown` / `Calendar` / `DatePicker` (`lib/components.tsx`); reuse `ModuleScreen` (`lib/modulescreen.tsx`) for list screens and the `QuickPanel` for pass-entry.
- Auth screens (`/login`) may render outside `AppShell` (no sidebar) but STILL use the design-system classes (cards/fields/buttons/alerts).
- When a new pattern is needed, add it to the library (globals.css + `lib/components.tsx`) and the `/ui` showcase — do NOT style it locally. The `/ui` page is the living catalogue; keep it in sync.
- Reviewer checklist for any new page: ✅ wrapped in `AppShell` (or documented exception) · ✅ zero inline hex/colours · ✅ inputs/dropdowns/tables/alerts come from the library · ✅ shown on `/ui` if it introduces a new component.

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
- [x] **Purchase invoice composer** (`modules/purchase`): high-level `{party, placeOfSupply, items[{purchaseLedgerId,taxable,gstRate}], tdsRate?}` → balanced voucher (Dr expense + Input CGST/SGST/IGST; Cr TDS Payable when deducted; Cr supplier = total−TDS). Migration `007_purchase_ledgers.sql` seeds `tds_payable` + `expense_purchase`. Math verified to balance (intra/inter/with-194Q/multi-item). Route `POST /api/v1/invoices/purchase`.
- [x] **Trial Balance report**: backend `GET /api/v1/reports/trial-balance` aggregates `voucher_lines` per ledger → net debit/credit closing + totals + balanced flag (`modules/reports`); web `/reports/trial-balance` page built from the UI library (FY dropdown, search, balanced banner, category pills, totals row), sidebar Reports→Trial Balance routes to it.
- [x] **Day Book** (`GET /api/v1/reports/day-book?date=`) — vouchers on a date with particulars + debit/credit totals; page `/reports/day-book` (DatePicker + type filter).
- [x] **Profit & Loss** (`GET /api/v1/reports/pnl`) — income − direct (cost of sales) = gross profit; − indirect = net profit; page `/reports/profit-loss` (KPI tiles + two-column statement).
- [x] **Balance Sheet** (`GET /api/v1/reports/balance-sheet`) — assets vs liabilities+equity, period profit carried to equity, balanced flag + suspense handling; page `/reports/balance-sheet` (two-sided).
- [x] **All voucher types compose & post**: unified `POST /api/v1/vouchers/compose` (discriminated union) for payment / receipt / contra / journal / credit-note / debit-note; Quick Entry wires every type through the composer API (mock-aware). Sales & Purchase composers already existed. All 8 compositions verified balanced.
- [x] **GST returns — GSTR-3B & GSTR-1** (`modules/gst`): GSTR-3B computes output tax vs ITC → net payable from the GST ledger balances; GSTR-1 outward-supplies summary. Pages `/gst/gstr-3b` (3.1/4/5.1 tables + tiles) and `/gst/gstr-1` (B2B/B2C rate-wise). Sidebar routed.
- [x] **GSTR-2B reconciliation** (`/gst/gstr-2b`): books ITC vs portal 2B, invoice-wise matched/mismatch/only-books/only-2b with status tiles + difference banner; backend `/gst/gstr-2b/books` books-side ITC summary.
- [x] **TDS challans (ITNS-281) + 26Q return** (`modules/tds`): backend `/tds/summary` (net TDS payable from `tds_payable` balance); pages `/tds/challans` (section-wise deducted/deposited/pending + status) and `/tds/returns` (26Q deductee-wise statement — PAN, section, rate, TDS, challan).
- [x] **Job work — pending inward/outward + ITC-04** (`modules/jobwork`, migration `008_jobwork.sql`): inward/outward challan tables; `/jobwork/pending` computes pending = received − dispatched − loss (status open/partial/closed); `/jobwork/itc04` Rule-45 movement summary. Pages `/jobwork/pending` and `/jobwork/itc04`.
- [x] **Payroll run + statutory** (`modules/payroll`): computes gross (basic+40% HRA+10% allowance), PF (12% of ≤₹15k), ESI (0.75% if gross ≤₹21k), Gujarat PT, TDS 192 (annual slabs /12) per employee → net + PF/ESI/PT/TDS deposit summary. Page `/payroll/run`.
- [x] **Period locks** (`modules/accounting/periods`, migration `009_period_locks.sql`): lock/unlock a month; **`createVoucher` calls `assertPeriodOpen`** so posting into a locked month is rejected server-side; page `/admin/periods` (Masters→Financial Year). Unlock is `voucher:approve`-gated + audited.
- [x] **Form 16** (`GET /api/v1/payroll/form16`): annual Part-B computation per employee (gross×12 − std 50k − PT − 80C(PF) → taxable → old-regime tax +4% cess = TDS 192); page `/payroll/form16` (employee list + Part-B detail + sample PDF served from `public/`).
- [x] **Feature-complete (per PRD, mock-aware UI)**: TCS (collections + 27EQ), GST **e-Invoice** (IRN/QR) + **e-Way** bills, **Lien/Forfeiture** recovery, **Process/Rate masters** (add-form CRUD), **Documents** repository, **Ageing** (receivable/payable buckets), **Compliance Calendar**, **Audit Trail**. Remaining generic list screens use `ModuleScreen`; live-API wiring/period runtime is the follow-up.

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

### 2026-07-28 — Task 19: Hugeicons round nav + comprehensive UI Library page
- **Round Hugeicons nav:** installed `hugeicons-react`; each sidebar group now shows a distinct icon inside a round badge (`.g-round`) via `GROUP_ICON` map in `lib/appshell.tsx`. Added **Widgets** (dashboard widget gallery, `/widgets`) and **UI Library** (`/ui`) to the Overview nav; new `lib/mock.ts` WIDGETS catalogue (20 widgets, role-tagged).
- **UI Library fix + build-out:** `/ui` was rendering without the sidebar and looked sparse. Rebuilt `app/ui/page.tsx` as a `'use client'` component wrapped in `<AppShell>` (sidebar now present) and expanded it into a full SaaS component reference in a responsive `.ui-grid`: labelled text inputs (hint/error/₹-prefix/textarea), native select + search + custom action **dropdown menu**, **switch/checkbox/radio**, segmented/**tabs**/toggle, **file-upload dropzone** + progress, **alerts** (info/ok/warn/err), pills/tags/badges, round icons, KPI tiles + KV rows, a full **data table** (row checkboxes, status pills, per-row action menu, **pagination** footer) and a **modal** dialog.
- Added supporting component CSS to `globals.css` (`.field`, `.input-prefix`, `.switch`, `.check`, `.dropdown-menu`, `.alert`, `.progress`, `.dropzone`, `.ui-modal`, `.tfoot/.pager`, `.ui-grid`). `next build` passes; verified full-page screenshot shows sidebar + all components. Merged to main.

### 2026-07-28 — Task 20: UI Library v2 — full input set, sortable table, working upload
- Fixed the "cards cut on both sides": `.card-body` had **no CSS rule**, so content sat flush against the card borders. Added base `.card-body { padding: 16px 18px }` (+ earlier `.content` full-width fix removing the 1440px cap that boxed the page on wide screens). Confirmed the user's earlier screenshot was a stale cached build.
- **Expanded `/ui` into a complete SaaS component library** (`app/ui/page.tsx`, stateful client component): text/number inputs (₹ prefix, % suffix, error), **email** (icon prefix), **phone** (country-code select + number), **password** (show/hide), **OTP** boxes, **date/time** pickers, select, search, **number stepper**, **range slider**, **tags/chips input**, **star rating**, switches/checkboxes/radios, segmented/tabs/two-state, buttons + **action dropdown** + **tooltip**, **working file upload** (drag-drop + browse, multi-file list with size + remove + empty state), alerts, **toast**, pills/tags/**avatar group**/progress, **wizard steps**, **accordion**, round icons, KPI tiles, **skeleton loader**, **modal**.
- **Data table upgraded**: **sort-by dropdown + Asc/Desc**, **sortable column headers** (click to sort, active arrow), select-all + row checkboxes, **bulk-action bar** on selection, and in the Actions column **inline icon buttons (Edit/Download/Print) are shown** with a **3-dot dropdown only for overflow** (duplicate/mark-filed/delete) — per request, not everything behind one dot. Pagination footer retained.
- Added supporting CSS to `globals.css` (`.otp`, `.stepper`, `.chips`, `.filelist`, `.th-sort`, `.rowacts`, `.bulkbar`, `.avatars`, `.acc`, `.tip`, `.rating`, `.skel`, `.steps`, `.empty`, `.toast`, `.bc`, `.sortby`, phone/password helpers). `next build` passes; verified full-page + table screenshots. Merged to main.

### 2026-07-28 — Task 21: Quick Entry aside panel (ported to React) + table "Show" option
- **Quick Entry aside panel** (`apps/web/lib/quickpanel.tsx`) — the voucher-type-driven pass-entry side panel from the HTML mockup, ported to a stateful React component and wired to the topbar **Quick Entry** button in `AppShell` (slides in over any page with a scrim). Voucher-type selector drives per-type fields + a series badge + description. Types: **Payment, Receipt, Contra, Journal, Sales, Purchase, Credit/Debit Note, Bank (multi-line), Job Work (Inward/Outward), Lien/Forfeiture, Payroll, and Ledger/Process/Rate masters**.
  - **Live computation:** Sales/Purchase/Notes GST (intra → CGST+SGST split, inter → IGST), Journal debit/credit **balance gate** (Post disabled until Dr = Cr), Job-work inward charge (qty×rate + GST, Cash vs Debit memo), Job-work **outward gated by pending qty** (dispatch + loss ≤ pending), Lien/forfeiture recovery (surplus/shortfall). Bank multi-line add/remove with Received/Paid totals in the footer.
  - **Post gating:** masters save directly; financial vouchers open a **signing-PIN modal** before posting (mock "Posted ✓"). Post button disabled until each type's required fields are valid.
- **Data table "Show" option** on `/ui`: added a rows-per-page selector (10/25/50/100) beside the existing Sort-by control; footer reflects "N per page".
- `next build` passes (all 8 routes). Verified via screenshots: panel opens over dashboard; Sales computes ₹25,000 → CGST/SGST ₹2,250 each → ₹29,500; Journal Post stays disabled while unbalanced. Merged to main.

### 2026-07-28 — Task 22: Reusable Dropdown + Calendar; all module pages use the UI library
- **New shared components** (`apps/web/lib/components.tsx`): `Dropdown` (custom styled trigger + menu, outside-click close, optional **searchable** filter, per-option hint, tick on selection), `Calendar` (month-grid date picker with prev/next nav, today + selected highlight, hydration-safe "today"), and `DatePicker` (input trigger + calendar popover). CSS added to `globals.css` (`.dd/.dd-trigger/.dd-menu/.dd-search`, `.cal/.cal-head/.cal-nav/.cal-grid/.cal-day`, `.dp/.dp-pop`, `.toolbar`).
- **All module pages now built from the UI library**: `apps/web/lib/modulescreen.tsx` renders a real list screen — page-head + "New …" action, a **filter toolbar** (Status Dropdown, searchable Party Dropdown, From/To **DatePickers**, search) and a full **data table** (sortable headers, select-all + row checkboxes, status pills, inline Edit/Download/Print actions + 3-dot overflow, Show/Sort controls, date-range chip, empty state, pagination). `/m/[...slug]/page.tsx` now renders `<ModuleScreen>` instead of the placeholder card, so every sidebar route (Sales Invoices, Vouchers, Ledgers, Job Work, TDS, …) is a working UI-library screen.
- **`/ui` showcase updated**: added a "Dropdowns, date & search" card (custom Dropdown, searchable Dropdown, DatePicker, native date/time) and a dedicated **Calendar** card (inline month grid + selected-date readout).
- `next build` passes (8 routes). Verified: module page renders the toolbar + table + open calendar popover (July 2026, today highlighted). Merged to main.

### 2026-07-28 — Task 23: Purchase invoice composer + web API wiring
- **Backend Purchase composer** (`apps/api/src/modules/purchase/*`): mirrors Sales. `POST /api/v1/invoices/purchase` takes `{partyLedgerId, placeOfSupply, date, items[{purchaseLedgerId,taxable,gstRate}], tdsRate?}` and composes a balanced voucher — **Dr** each expense head + **Input** CGST/SGST (intra) or IGST (inter); **Cr** TDS Payable (when `tdsRate` set, on the taxable value) + **Cr** supplier (bill total − TDS). Debits (taxable+input GST) = credits (payable+TDS) by construction. New `purchaseInvoiceSchema`/`PurchaseInvoiceInput` in `@fintranact/validation`; router mounted in `app.ts`. Migration **`007_purchase_ledgers.sql`** seeds `tds_payable` (liability) + `expense_purchase`. Verified balanced for intra 18%, inter 18%, intra+194Q 0.1%, and multi-item inter 12%+5% with 2% TDS. **All 6 workspaces typecheck green.**
- **Web API client** (`lib/api.ts`) extended (mock-aware): `listLedgers`, `listVouchers`, `createSalesInvoice`, `createPurchaseInvoice` (real endpoints when `NEXT_PUBLIC_USE_MOCK=false`, canned data otherwise).
- **Quick Entry wired**: Sales/Purchase posts now call the composer via the client — after the signing-PIN the button shows the returned voucher no. (e.g. "Posted ✓ SI/26-27/0484"); mock returns a canned number so the Vercel demo still works.
- **Module screens wired**: when not in mock mode, voucher-type module pages load live rows from `GET /api/v1/vouchers`; mock rows remain the default for the standalone demo.
- `next build` passes (8 routes); smoke-tested the Sales→PIN→post flow end-to-end. Merged to main.

### 2026-07-28 — Task 24: UI library made compulsory; all pages migrated onto it
- Added the **MANDATORY RULE** (top of this file): every page must be built from the `@fintranact/ui` design system — tokens + component classes in `globals.css` and the shared React components (`AppShell`, `Dropdown`, `Calendar`/`DatePicker`, `ModuleScreen`, `QuickPanel`). No inline hex / bespoke styling. `/login` may skip `AppShell` but still uses library classes. New patterns go into the library + `/ui` showcase, never styled locally.
- **Migrated the last two off-library pages:**
  - `/import` rebuilt from the library — page-head, `.ui-grid` two-card layout, `Dropdown` for entity + FY, `.dropzone` upload with selected-file chip, `.btn` actions, `.alert` status, and a `.pill` validation-preview table.
  - `/login` rebuilt as a design-system `.card` (logo panel, `.field`/`.ctl` inputs, `.btn-primary`, `.alert` error) instead of inline styles.
- **Removed dead `apps/web/lib/ui.tsx`** (legacy `C` palette + `Shell`) — no longer referenced. Audit: all routes now use the library (`/dashboard`, `/import`, `/widgets`, `/ui`, `/m/[…]` via `ModuleScreen`, `/login`; `/` redirects).
- `next build` passes (8 routes). Verified import + login screenshots. Merged to main.

### 2026-07-28 — Task 25: Trial Balance report (backend + UI-library page)
- **Backend** (`apps/api/src/modules/reports/*`): `GET /api/v1/reports/trial-balance` (perm `report:view`) aggregates `voucher_lines` joined to `ledgers` — per ledger `SUM(dr_amount)`/`SUM(cr_amount)`, nets to a debit or credit closing, returns rows + `totalDebit`/`totalCredit` + `balanced`. Router mounted in `app.ts`. API typechecks.
- **Web**: `getTrialBalance()` added to `lib/api.ts` (mock-aware; balanced mock dataset). New page `apps/web/app/reports/trial-balance/page.tsx` built entirely from the UI library — page-head + Print/Export, `Dropdown` FY filter + search toolbar, a **balanced/out-of-balance alert**, and a table (ledger, group category pill, Debit, Credit) with a bold Total row. Sidebar **Reports → Trial Balance** now routes to `/reports/trial-balance` (per compulsory-UI rule, a dedicated library-built screen). Verified: mock TB balances at ₹3,62,40,520 = ₹3,62,40,520.
- `next build` passes (9 routes). Merged to main.

### 2026-07-28 — Task 26: Day Book + Profit & Loss reports (backend + UI-library pages)
- **Backend** (`modules/reports`): added `GET /api/v1/reports/day-book?date=YYYY-MM-DD` (vouchers posted on a date → per-voucher debit/credit + concatenated particulars + day totals) and `GET /api/v1/reports/pnl` (income ledgers as credit balances, expenses as debit balances split into direct cost-of-sales vs indirect → gross & net profit). Both `report:view`. API typechecks.
- **Web** (mock-aware `getDayBook`/`getPnl` in `lib/api.ts`), two new pages built entirely from the UI library:
  - `/reports/day-book` — `DatePicker` (calendar) + type `Dropdown`, table (voucher+narration, type pill, particulars, Dr/Cr) with a day-total footer (totals agree).
  - `/reports/profit-loss` — KPI tiles (Revenue / Gross / Net) + a two-column statement (Income + Direct → Gross Profit | Indirect → Net Profit) with margins. Mock verified: 2,19,80,000 − 72,80,000 = 1,47,00,000 gross; − 77,00,000 = 70,00,000 net.
  - Sidebar **Day Book** and **Profit & Loss** route to the new pages (compulsory-UI rule).
- `next build` passes (11 routes). Merged to main.

### 2026-07-28 — Task 27: Report balance-mismatch handling + shared UI-library report primitives
- **Mismatch is never shown silently.** Added shared report primitives to the UI library (`lib/components.tsx`): `money()` formatter, `reconcile(debit, credit)` (balanced?/difference/short-side/grand), and `<ReportBanner>` (info when there's no data, success when Dr=Cr, **error with the exact difference** when they don't tally).
- **Trial Balance** now: shows the info banner for an empty period (no longer falsely "balanced" at 0=0); on a mismatch shows the red banner **and appends a red "Difference in balances (suspense)" row** on the short side so both columns foot to an equal grand total (standard Tally-style treatment). Verified by forcing a ₹40,000 mismatch → suspense row + equal totals, then reverted the mock.
- **Day Book** uses `<ReportBanner>` (per-day Dr=Cr / empty-day) and the shared `money` formatter; **P&L** uses `money` too. All three reports now use the same library primitives instead of ad-hoc `inr()` — "use the UI library properly."
- `next build` passes (11 routes); validation/api/web typecheck green. Merged to main.

### 2026-07-28 — Task 28: Proper report grand-total (tfoot) styling
- Added a dedicated **report total-row** style to the UI library (`globals.css`, scoped to `table tfoot td` — only the Trial Balance & Day Book report tables use a real `<tfoot>`): tinted band, 2px top rule, uppercase bold "TOTAL", tabular-nums amounts with an accounting-style **double-rule** (inset box-shadow) under the grand total. Removed the ad-hoc inline styles from the Trial Balance and Day Book total rows so they use the shared class.
- `next build` passes; verified the total line renders as a proper statement footer. Merged to main.

### 2026-07-28 — Task 29: Balance Sheet report (backend + UI-library page)
- **Backend** (`modules/reports`): `GET /api/v1/reports/balance-sheet` classifies ledgers into **assets** (debit-nature: bank/cash/debtors/fixed assets), **liabilities** (credit-nature: creditors/duties/provisions), **equity** (capital/reserves); `tax` and uncategorised ledgers fall to the correct side by balance sign; P&L ledgers are excluded and their **net profit is carried to equity as "Profit for the period."** Returns totals + `balanced`. `report:view`. API typechecks.
- **Web**: `getBalanceSheet()` (mock-aware, balanced dataset), page `/reports/balance-sheet` built from the UI library — two-sided `ui-grid` (Assets | Liabilities & Equity with Liabilities/Equity subheads), the shared `<ReportBanner>` (balanced/empty/mismatch with a **suspense difference row** on the short side), `money`, and the report **tfoot grand-total** styling. Sidebar **Reports → Balance Sheet** routes to it. Verified balanced: assets = liab+equity = ₹2,71,70,520 (Profit for the period ₹70,00,000 in equity).
- Completes the core report set (Trial Balance · Day Book · P&L · Balance Sheet). `next build` passes (12 routes). Merged to main.

### 2026-07-28 — Task 30: All voucher types compose & post (unified composer)
- **Backend** (`modules/vouchers/compose.*`): one endpoint `POST /api/v1/vouchers/compose` takes a **discriminated union** (`kind`: payment | receipt | contra | journal | credit_note | debit_note) and builds a balanced double-entry voucher, then posts it via the shared voucher engine (which re-checks Dr==Cr). Payment supports TDS (Dr party gross; Cr TDS payable; Cr bank net); credit-note reverses output GST (Dr income + Dr output GST; Cr party); debit-note reverses input ITC (Dr party; Cr expense + Cr input GST); contra/journal guard same-ledger. `voucherComposeSchema` added to `@fintranact/validation`; router mounted. **All 8 compositions verified balanced** (incl. TDS + intra/inter GST notes). API typechecks.
- **Web**: `composeVoucher()` added to `lib/api.ts` (mock-aware, returns a series voucher no.). **Quick Entry now posts every voucher type** through the composer/invoice APIs after the signing PIN — smoke-tested Payment → "Posted ✓ PMT/26-27/0210". Sales & Purchase continue via their composers.
- `next build` passes. Merged to main. Together with the earlier Sales/Purchase composers, the full voucher set (8 types) is now postable end-to-end.

### 2026-07-28 — Task 31: GST returns — GSTR-3B & GSTR-1
- **Backend** (`modules/gst`): `GET /api/v1/gst/gstr-3b` derives output tax (output CGST/SGST/IGST credit balances) vs eligible ITC (input GST debit balances) and computes **net payable in cash per head** = max(0, output − ITC); `GET /api/v1/gst/gstr-1` returns the outward-supplies summary (taxable + output tax + sales/CN invoice count). Both `report:view`. API typechecks.
- **Web** (mock-aware `getGstr3b`/`getGstr1`), two pages from the UI library:
  - `/gst/gstr-3b` — KPI tiles (output / ITC / net payable), **3.1 outward**, **4 eligible ITC**, and **5.1 tax payable & paid in cash** (Output − ITC set-off = cash) tables with report tfoot totals. Verified: 22,08,000 − 6,20,000 = 15,88,000 net.
  - `/gst/gstr-1` — summary tiles + **B2B / B2C rate-wise** tables (rate pill, taxable, IGST/CGST/SGST) with totals.
  - Sidebar **GST & Returns → GSTR-1 / GSTR-3B** route to them.
- `next build` passes (14 routes). Merged to main. First slice of the GST-returns phase.

### 2026-07-28 — Task 32: GSTR-2B reconciliation
- **Backend** (`modules/gst`): `GET /api/v1/gst/gstr-2b/books` returns the books-side ITC total (input GST debit balances) + purchase/DN invoice count for reconciliation (the portal 2B is pulled from GSTN client-side / a later job). `report:view`. API typechecks.
- **Web**: `getGstr2b()` (mock-aware recon dataset), page `/gst/gstr-2b` from the UI library — a difference **banner** (books vs 2B), four status **tiles** (Matched / Mismatch / Only in books / Only in 2B), a **status filter Dropdown**, and an invoice-matching table (supplier+GSTIN, invoice+date, ITC in books, ITC in 2B, difference, status pill) with a report **total row**. Sidebar **GST & Returns → GSTR-2B Reconciliation** routes to it. Verified: books ₹46,260 vs 2B ₹43,560, net diff ₹2,700.
- `next build` passes (15 routes). Completes the GST-returns trio (GSTR-1 · 3B · 2B recon). Merged to main.

### 2026-07-28 — Task 33: TDS challans (ITNS-281) + 26Q return
- **Backend** (`modules/tds`): `GET /api/v1/tds/summary` returns net TDS payable (credit balance of the `tds_payable` ledger = deducted less deposited) + count of vouchers carrying a TDS leg. `report:view`. Mounted in `app.ts`. API typechecks.
- **Web** (mock-aware `getTdsChallans`/`getTdsReturn`), two pages from the UI library:
  - `/tds/challans` — ITNS-281 section-wise (194C/J/I/Q): deductees, TDS amount, challan/BSR, due-or-paid, status pills; tiles (deducted / deposited / pending) + a due-warning banner; report total row.
  - `/tds/returns` — 26Q deductee-wise statement (deductee, PAN, section pill, amount paid, rate, TDS, challan pill), quarter + section filter dropdowns, tiles, total row. Verified: TDS total ₹3,66,200 on ₹1,86,30,000 paid.
  - Sidebar **TDS → Challans ITNS 281 / Returns 24Q 26Q 27Q** route to them.
- `next build` passes (17 routes). Merged to main. First TDS slice (challans + non-salary 26Q).

### 2026-07-28 — Task 34: Job work — pending inward/outward tracking + ITC-04
- **DB** `008_jobwork.sql`: `job_work_inward` (challan, customer, process, qty_recd, rate, gst, memo_type) + `job_work_outward` (inward_id, qty_out, loss) with Rule-45 challan numbers.
- **Backend** (`modules/jobwork`): `GET /api/v1/jobwork/pending` lists inward challans with **pending = received − dispatched − loss** and a status (open/partial/closed); `GET /api/v1/jobwork/itc04` returns the Rule-45 movement summary (received vs returned vs pending). `report:view`. Mounted; API typechecks.
- **Web** (mock-aware `getJobworkPending`/`getItc04`), two pages from the UI library:
  - `/jobwork/pending` — the key operational screen: status filter, pending-ageing warning banner, tiles (inward / open / pending kg), and a challan table (received/dispatched/loss/pending kg, status pill) with a totals row. Verified: 2,870 − 1,700 − 15 = **1,155 kg pending**.
  - `/jobwork/itc04` — Rule-45 quarterly statement: tiles (inward/outward challans, qty received/returned/pending) + a Table-4 challan list. Returned 1,715 = dispatched+loss, consistent with pending page.
  - Sidebar **Job Work → Pending Inward Outward / ITC-04** route to them.
- `next build` passes (19 routes). Merged to main.

### 2026-07-28 — Task 35: Payroll run with statutory deductions
- **Backend** (`modules/payroll`): `GET /api/v1/payroll/run?month=` reads employees and computes each payslip — gross = basic + 40% HRA + 10% allowance; **PF** 12% of min(basic, ₹15,000); **ESI** 0.75% of gross when gross ≤ ₹21,000; **PT** Gujarat monthly slab; **TDS 192** from old-regime annual slabs (std deduction ₹50k + 80C on PF) spread /12 — then net + employee/employer statutory totals. `report:view`. Mounted; API typechecks; math spot-checked at basic 12k/25k/60k.
- **Web** (mock-aware `getPayrollRun`, same formulas; 7 sample employees), page `/payroll/run` from the UI library — pay-month dropdown + biometric source, tiles (employees / gross / deductions / net), a **salary register** table (basic, gross, PF, ESI, PT, TDS, net) with a totals row, and a **"Statutory to deposit"** card (PF ECR employee+employer, ESI, PT, TDS→24Q, total). Verified fully consistent: gross ₹2,97,000 − deductions ₹26,714 = net ₹2,70,286; statutory payout ₹39,708. "Approve & post" flashes posted. Sidebar **Payroll & HR → Payroll Run** routes to it.
- `next build` passes (20 routes). Merged to main.

### 2026-07-28 — Task 36: Period locks (close-the-books integrity)
- **DB** `009_period_locks.sql`: `period_locks (company, period YYYY-MM, note, locked_by, locked_at)`.
- **Backend** (`modules/accounting/periods`): `isPeriodLocked` / `assertPeriodOpen`; **wired into `createVoucher`** (inside the txn) so any voucher whose date falls in a locked month is rejected (`Period YYYY-MM is locked`). Routes: `GET /periods`, `POST /periods/lock`, `POST /periods/unlock` — lock/unlock are **`voucher:approve`-gated and audited** (`period.lock` / `period.unlock`). Mounted; API typechecks. (Since every composer posts via `createVoucher`, all voucher types inherit the guard.)
- **Web** (mock-aware `listPeriodLocks`/`lockPeriod`/`unlockPeriod`), page `/admin/periods` from the UI library — an info banner, a "Close a month" card (period Dropdown + reason + Lock) and a "Locked periods" table (period, note, locked-by, on, Unlock). Sidebar **Masters → Financial Year** routes to it.
- `next build` passes (21 routes). Merged to main.

### 2026-07-28 — Task 37: Sidebar UX — collapse, persistence, accordion, flyout
- Reworked `lib/appshell.tsx` nav from native `<details>` to controlled React state:
  - **Accordion** — only one group open at a time (`openGroup`); clicking a header opens it and closes the rest.
  - **Persistence** — `openGroup` and collapsed state saved to `localStorage` (`fx-open-group`, `fx-rail-collapsed`) and restored on mount, so the open drawer survives a reload; defaults to the active route's group.
  - **Collapse toggle** — a `.collapse-btn` shrinks the rail to a 76px icon-only strip (`.app.rail-collapsed`); state persists.
  - **Collapsed = tooltips + flyout** — group headers carry `title` tooltips; hovering a collapsed group opens a **floating menu** (`.flyout`) with the group name, badge and all its page links (positioned to the right; nav `overflow` opened in collapsed mode so it isn't clipped).
- Converted the CSS selectors (`details.grp > summary` → `.grp .grp-head`, `[open]` → `.grp.open`), added `.sub` show/hide, collapse-mode, flyout and tooltip styles to `globals.css`.
- `next build` passes. Verified: accordion single-open, collapsed icon rail with alert dot, and the GST flyout listing its pages. Merged to main.

### 2026-07-28 — Task 38: Dashboard fully on UI components (hex audit clean)
- Audited every page for ad-hoc colours; only `/dashboard` still had 5 hardcoded hex values (chart outflow line + legend `#6C6C76`, neutral stripes `#C9C7CB`, avatar gradient `#7A0913`). Replaced with design tokens (`var(--text-3)`, `var(--red-ink)`) — the dashboard is already built from library components (`.tile`, `.card`, `.kv`, `.pill`, table styles, chart), now with **zero hardcoded hex**.
- Confirmed **all pages** (dashboard, reports, GST, TDS, job-work, payroll, periods, import, login, module screens, UI library) are component-based with no 6-digit hex — the compulsory UI-library rule holds across the app.
- `next build` passes; dashboard verified rendering (KPI tiles, cash-flow chart, compliance, P&L) with tokens. Merged to main.

### 2026-07-28 — Task 39: Dropdown QA — fix clipped row-action menus (portal RowMenu)
- Ran an interactive audit of every dropdown: custom `Dropdown` (open/select/close), searchable `Dropdown` (type-to-filter), `DatePicker` calendar (open/pick/close) — all pass. **Found one bug:** the table **row-action 3-dot menu was clipped** by the table's `overflow-x:auto` scroll wrapper.
- **Fix:** new shared `<RowMenu>` component (`lib/components.tsx`) renders its popover in a **fixed-position React portal** (`createPortal` to `document.body`), positioned from the trigger's `getBoundingClientRect`, so it can never be clipped; closes on outside-click, scroll, resize, or item select. Replaced the inline row menus in `ModuleScreen` and the `/ui` data table with `<RowMenu>`.
- Verified after fix: row menu `position=fixed`, parent=BODY, `clip=ok`, closes on select. All other dropdowns unaffected. `next build` passes. Merged to main.

### 2026-07-28 — Task 40: Form 16 (annual salary TDS certificate)
- **Backend** (`modules/payroll`): `computeForm16` / `listForm16` + `GET /api/v1/payroll/form16` — annualises each payslip (gross×12), applies **std deduction ₹50k, PT u/s 16(iii), 80C = PF (cap ₹1.5L)** → taxable income → old-regime `annualTax` (+4% cess) = TDS u/s 192. `report:view`. API typechecks; verified (basic 60k → taxable ₹10,06,000, TDS ₹1,18,872).
- **Web** (mock-aware `getForm16`), page `/payroll/form16` from the UI library — tiles (employees / total TDS / certificates), an **employee list** (name, PAN, gross, TDS, per-row PDF link) with a total row, and a **Part-B computation** panel for the selected employee (gross → deductions → taxable → tax → TDS). The **sample Form 16 PDF** is copied to `apps/web/public/Form16_sample.pdf` and linked from the header + each row. Added **Form 16** to the Payroll & HR sidebar group and routed it.
- `next build` passes (22 routes). Merged to main. Payroll block now: run + statutory + Form 16.

### 2026-07-28 — Task 41: Complete remaining PRD screens (feature-complete)
- Built the remaining distinctive pages, all from the UI library, mock-aware, sidebar-routed:
  - **TCS**: `/tcs/collections` (206C(1H) with deposit status) + `/tcs/returns` (27EQ buyer statement).
  - **GST**: `/gst/e-invoice` (IRN/ack/QR status + generate) + `/gst/e-way` (consignments, distance, validity).
  - **Job work**: `/jobwork/lien` (overdue vs material held, assessed vs expected sale, surplus/shortfall).
  - **Masters**: `/masters/process` and `/masters/rate` (add-form + table, RowMenu actions).
  - **Documents**: `/documents` (dropzone upload, category filter, voucher links) — Documents nav now points here (import stays at `/import`, linked).
  - **Reports**: `/reports/ageing` (receivable/payable 0-30/31-60/61-90/90+ buckets with totals).
  - **Overview**: `/compliance` (all statutory due dates ranked by urgency), `/admin/audit` (hash-chained audit log viewer).
- **Smoke-tested all 30 routes → HTTP 200.** `next build` passes. Merged to main in 3 batches (TCS+eInv/eWay · lien+masters+docs · ageing+compliance+audit).
- **Status:** every PRD module now has a working screen (bespoke where distinctive, generic `ModuleScreen` list for the rest). The app is navigable end-to-end in mock mode; the remaining backend work is live-API wiring + Phase-0 runtime (MySQL/argon2/migrate/seed) and the Windows device bridge.

### 2026-07-28 — Task 42: Working toasts + notifications drawer (from the UI library)
- **Toast system** (`lib/toast.tsx`): module-level `toast(text, kind)` + `<ToastHost>` (portal, fixed stack, slide-in, ok/err/info accents; CSS in globals.css). Mounted once in `AppShell`.
- **Voucher post feedback**: Quick Entry `doPost` now fires a success toast — e.g. **"Voucher PMT/26-27/0210 posted — books balanced."** (or "… saved" for masters, error toast on failure) and closes the panel. Verified end-to-end.
- **Notifications bell works**: `lib/notifications.tsx` `<NotificationDrawer>` (uses the existing `.ntpanel/.nt-*` design-system CSS) — right-side drawer with All/Tasks/Alerts tabs + counts, day grouping, per-item icon/title/body/action-chips/unread dot, **click-to-read** and **mark-all-read**. Notifications seeded in `mock.ts`. The topbar bell opens it and shows a **live unread badge** (hides at 0). Verified: opens with 9 items; badge clears after mark-all-read.
- `next build` passes. Merged to main.

### 2026-07-28 — Task 43: Header dropdowns use the UI library Dropdown
- The dashboard/topbar had **native `<select>`** for FY and role (and a plain button switcher) — not the design-system component. Replaced all three with the shared `<Dropdown>` (`lib/components.tsx`):
  - **Company/branch switcher** (green dot icon, unit + GSTIN hint, tick on selected),
  - **Financial year** selector,
  - **Role** selector (wired to `setRole`; switching updates dashboard KPIs + rail footer).
- Added compact pill styling for `.topsel-dd .dd-trigger` and preserved the responsive hide (FY <1120px, role/branch <860px) in `globals.css`. Verified: role menu has 7 options, selecting "Owner / Director" switches the view; branch menu opens with both units. `next build` passes. Merged to main.

### 2026-07-28 — Task 44: Center the toast + convert every native <select> to the UI Dropdown
- **Toast centered**: `.toast-stack` moved from bottom-right to **top-center** (fixed, translateX(-50%), ~22% from top, slide-in). Verified centered (centerX = viewport/2). Success toast on post: "Voucher SI/26-27/0484 posted — books balanced."
- **All native `<select>` → shared `<Dropdown>`** (the "same thing everywhere" pass):
  - **QuickPanel**: all **38** native selects replaced via a local `Sel` helper wrapping `<Dropdown>` (voucher-type selector flattened with group hints; place-of-supply / GST-rate / process kept driving live compute; job-work Process auto-fills the rate via `onPick`). Live GST verified unchanged (₹25,000 → CGST/SGST ₹2,250 → ₹29,500).
  - **ModuleScreen**: Show (page size) + Sort-by selects → `<Dropdown>`.
  - Header FY/role/branch already converted (Task 43).
- Only the `/ui` **showcase** keeps a native `<select>` on purpose (it documents the native control alongside the custom Dropdown). `next build` passes. Merged to main.

### 2026-07-28 — Task 45: Centered status-card host (all kinds), flag phone selector, flyout fix, per-page Quick Entry
- **Status card host** (`lib/success.tsx`, replaces the toast for voucher feedback): a **centered, auto-closing card with NO button** (per the reference image, minus the button). `showSuccess/showError/showWarning/showInfo/showStatus` emit to a mounted `<SuccessHost>` (portal to body). Green scalloped-style badge + title + key/value rows + "This closes automatically" hint; ok closes at 2.6s, others at 3.4s; click-scrim also dismisses. Four kinds — **ok** (green `CheckmarkBadge01`), **err** (red `Alert02`), **warn** (amber `Alert01`), **info** (slate `InformationCircle`) — each with its own `.ok-badge.{kind}` tint. Verified all four render centered. Mounted in `AppShell`.
  - QuickPanel `doPost` now calls `showSuccess({...})` on post (voucher no./type/date/amount rows, or type/series/date for masters) and `showError(...)` on failure; removed the old inline `posted` state.
- **Flag country selector** (`PhoneInput` in `components.tsx`): searchable `<Dropdown>` of countries (flag + dial code, country-name hint) + a `tel` input; 10 seed countries led by 🇮🇳 +91. Used on the `/ui` phone field. `.phone-field` CSS added.
- **Collapsed-rail flyout fix**: native `title` tooltip was overlapping the hover flyout — swapped `title` → `aria-label`; flyout now `max-height: calc(100vh - 24px)` with `overflow-y:auto`, and the bottom two groups anchor upward (`nth-last-child(-n+2)`) so nothing clips off-screen.
- **Per-page Quick Entry** ("their own task"): `quickTypeFor(pathname)` in `AppShell` maps the route → the relevant voucher/task and passes it as `initialType` to `<QuickPanel>`, which opens to that type. Verified: Sales Invoices→Sales Invoice, Purchase Bills→Purchase Bill, Payroll Run→Payroll Run, Process Master→Process master, Lien Forfeiture→Lien / Material Forfeiture.
- `next build` passes. Merged to main.
- **Full-coverage pass ("all other voucher like job work and all")**: audited every nav page → quick-type. Job Work all resolve (Inward memo/Outward Challans/Pending/Job Cards→Job Work, Lien→Forfeiture, ITC-04→Job Work). Added `quickJobDir(pathname)` + `initialJobDir` prop so **Outward Challans opens Job Work in the *outward (dispatch)* direction** and inward pages open inward. Added party mapping (Customers & Vendors → Ledger party master) and TCS Collections → Receipt. Pages with no matching entry task (Reports, Admin, return-filing screens, Dashboard) fall back to the generic Payment pass-entry by design. Verified all four refinements live. `next build` passes. Merged to main.

### 2026-07-28 — Task 46: Seed enhancements + editable numbering (Settings) + backend voucher PDF
Three-part build (user opted into all three; PDF = backend service).
- **Part A — data/seed (migrations 010–013 + seed.ts):**
  - `010_ledger_groups.sql`: new `ledger_groups` table (Tally-style COA heads) — 13 primary groups (Capital, Loans, Current Liabilities/Assets, Fixed Assets, Investments, Sales/Purchase Accounts, Direct/Indirect Income/Expenses, Suspense) + sub-groups (Bank Accounts, Cash-in-Hand, Sundry Debtors/Creditors, Duties & Taxes, Provisions, Secured/Unsecured Loans, Bank OD, Stock-in-Hand, Loans & Advances). Added `ledgers.group_id` FK; re-homed the 006/007 system ledgers (GST/TDS → Duties & Taxes, Job Work Charges → Direct Income, Purchases → Purchase Accounts, Round Off → Indirect Expenses).
  - `011_company_statutory.sql`: moved statutory block to **company** (single GSTIN/city) — added gstin/tan/cin/gst_reg_type/pt_regn/pf_regn/esi_regn/address/city/state_code/pincode to `companies`, seeded RAVI's (GSTIN 24AABCS1429P1Z5, PAN AABCS1429P, TAN RKTR02914E, Rajkot/24/360003). Branch stays a location label.
  - `012_geo_masters.sql`: `states` (37 GST state codes) + `cities` (20 Gujarat towns incl. Rajkot + 10 metros) reference data for dropdowns.
  - `013_series_settings.sql`: added internal series `eway` (EWB/), `einvoice` (EINV/), `jobwork_inward` (JW-IN/), `jobwork_outward` (JW-OUT/), `lien` (LIEN/), `payroll` (PAY/); added `settings:manage` permission (→ controller). NOTE: IRN/EWB numbers come from the govt portal — our series are only internal doc refs.
  - `seed.ts`: admin login changed to **admin@raviMetal.com / Ravi@1234** (still env-overridable).
- **Part B — editable numbering in Settings:** new API module `modules/settings` (`GET /settings/numbering`, `PATCH /settings/numbering/:type` gated by `settings:manage` + audited, `GET /settings/company`). Web: new page `app/admin/config/page.tsx` (nav "System & Tax Config" → `/admin/config`) — company statutory card + editable numbering table (prefix / next no / width) with **live "next number" preview** and per-row Save → success card. `api.ts` gained `getNumberingSeries`/`updateNumberingSeries`/`getCompanyProfile`/`voucherPdfUrl` with mock data. Verified live: edited Sales Invoice next-no → SI/26-27/0500, success card fired.
- **Part C — backend voucher PDF:** added `pdfkit`. `modules/vouchers/pdf.service.ts` `renderVoucherPdf(voucher, company)` → Buffer: branded header (company + GSTIN/PAN/TAN), title band (voucher type/no/date/status), narration, ledger Dr/Cr table + totals, signature block, footer. Route `GET /api/v1/vouchers/:id/pdf` streams `application/pdf`. Uses "Rs." (pdfkit Helvetica has no ₹ glyph). Verified by rendering a sample invoice PDF (valid %PDF, correct layout).
- API `typecheck` + web `build` both pass. Merged to main.

### 2026-07-28 — Task 47: Remove ALL frontend mock → fully backend-driven (live API), auto-migrate/seed on boot
User: "remove mock data from frontend" → chose **backend-only, delete mock** + **build the missing endpoints too**; "all page have their own data once we start from then using live backend" (empty on fresh install, accrues through use); "make seed auto based on version on server start"; "also dashboard and kpi data api".
- **Auto-migrate + seed on startup** (`main.ts` `bootstrap()`): calls `runMigrations()` + `runSeed()` before `listen` (versioned via `schema_migrations`, idempotent seed). `migrate.ts`/`seed.ts` refactored to export functions + keep CLI guards. Guarded by `AUTO_MIGRATE!==false`; fail-fast in prod.
- **New backend endpoints** (all company-scoped, real rows, empty until used):
  - `modules/appdata`: `/tds/challans`, `/tds/returns`, `/tcs`, `/gst/e-invoice`, `/gst/e-way`, `/jobwork/lien`, `/reports/ageing`, `/audit` (real audit_logs), `/compliance`, `/documents`, `/notifications`.
  - `modules/masters`: `/masters/process` (GET+POST), `/masters/rate` (GET+POST).
  - `modules/dashboard`: `/dashboard?role=` (per-role KPI layout as config, **values computed live** from voucher_lines↔ledger_groups + counts), `/config/roles` (role switcher), `/widgets` (catalog config).
  - Migration `014_app_data_tables.sql`: process_masters, rate_masters, documents, notifications, tcs_collections, eway_bills, e_invoices, lien_cases, compliance_items, tds_challans, tds_deductees.
- **Frontend fully de-mocked**: `lib/mock.ts` **deleted**. `lib/api.ts` rewritten as pure fetch (no `MOCK`, no canned data; `getJson`/`sendJson` helpers) + new `getDashboard/getWidgets/getRoleList/getNotifications/addProcessMaster/addRateMaster`. Rewired the 6 direct-import files: login (creds admin@raviMetal.com), import (ImportValidation type), notifications drawer (Notif from api), appshell (roles + notifications fetched), dashboard (fully live KPIs/P&L/compliance/recent-vouchers with empty states), widgets (getWidgets+getRoleList). `modulescreen` reads live vouchers, empty otherwise.
- **Verified against a real DB**: installed MariaDB (collation pinned utf8mb4 via init_connect), migrated 014, API auto-migrates+seeds on boot. Browser E2E on live stack: login → dashboard (live ₹0 KPIs + empty states), settings shows live GSTIN, sales list empty state; posted a journal via compose → `JV/26-27/0001`, dashboard "Vouchers·month"→1 with it in Recent Vouchers. API typecheck + web build pass. NOTE: `NEXT_PUBLIC_API_URL` points the web at the API (build-time inline); dev DB `.env` is gitignored.
- **Env/ops gotchas** (for future live runs): foreground `sleep` is blocked (exit 144) — use a `for` poll loop; NEVER `pkill -f "dist/main.js"` (self-matches the shell → 144) — kill the API with `fuser -k 4000/tcp`. Start MariaDB with `mysqld_safe --datadir=/var/lib/mysql &`; needs the utf8mb4/init_connect config at `/etc/mysql/mariadb.conf.d/99-fx.cnf`.

### 2026-07-28 — Task 48: Real integrations — e-Invoice (IRN), e-Way Bill, WhatsApp
Provider-abstraction layer with **sandbox mode default** (deterministic, no network/creds) + **live HTTP path behind config** (set `*_MODE=live` + creds to hit IRP/NIC/Meta).
- **config.ts** `integrations`: einvoice/eway/whatsapp each `{ mode, apiUrl, apiKey|token/phoneId }` (env-driven, default sandbox).
- **Migration 015**: e_invoices +voucher_id/signed_qr/ack_date/error; eway_bills +voucher_id/vehicle_no/transport_mode/error; new `whatsapp_messages` log.
- **`modules/integrations`**: `einvoice.service` (sandbox = sha256 IRN + 15-digit AckNo + base64 signed-QR; live = GSP/IRP POST), `eway.service` (sandbox = 12-digit EWB + distance-slab validity 1d/200km; live = NIC POST; guards ₹50k), `whatsapp.service` (sandbox msg-id; live = Meta Graph `/{phoneId}/messages` text|document; phone normalised to 91…), routes: `POST /gst/e-invoice/generate`, `POST /gst/e-way/generate`, `POST /whatsapp/send`, `GET /whatsapp/messages`, `GET /integrations/status`. All audited.
- Reworked `GET /gst/e-invoice` to list **every sales voucher** with IRN status (generated|pending) so the UI can generate; party = max-debit line.
- **Frontend**: api.ts `generateEInvoice/generateEway/sendWhatsApp/listWhatsApp/getIntegrationsStatus`. e-Invoice page: per-row **Generate IRN** + bulk "Generate pending", **Send on WhatsApp** modal (pre-filled message), sandbox/live badge. e-Way page: **New e-Way bill** modal (invoice/route/distance/value/vehicle, ₹50k guard) → generate. Uses success/error cards.
- **Verified E2E in browser**: generated IRN (party Mahalaxmi Traders, ack shown), sent WhatsApp (→ 919825012345, status sent, sandbox), generated EWB `2210 0942 0454` (Rajkot→Ahmedabad, valid 2 days) — list refreshed to 2 active bills. API typecheck + web build pass. Merged to main.

### 2026-07-28 — Task 49: Leave apps, Whitebooks GSP, e-way(outward)/e-invoice(service), WhatsApp outstanding, all-voucher PDF + print-bank setting
- **Leave applications**: `leave_requests` table + `modules/leave` (POST /leave apply, GET /leave, PATCH /leave/:id/decision approve|reject, gated payroll:run). New page `/payroll/leave` (nav "Attendance & Leave" → it): apply form + applications table with Approve/Reject. Verified live.
- **Whitebooks GSP**: `config.integrations.gsp` (provider=whitebooks default, GSP_* creds). `modules/integrations/whitebooks.ts` (authenticate→cache token→GENERATE for IRN + e-way). e-invoice/e-way **live** paths route through Whitebooks when provider=whitebooks. NOTE: written to Whitebooks' documented header/endpoint shape; SEK/AES payload encryption + exact response keys need their sandbox to finalise (sandbox mode still default/verified).
- **e-way = job-work outward; e-invoice = service invoice**: e-Way page is the outward-dispatch generator (modal, ₹50k guard). Added **auto-IRN on service invoice**: company `auto_einvoice_service` flag; sales route auto-generates IRN on post when on (verified: SI/26-27/0002 posted → IRN auto-generated). Toggle in Settings → Automation.
- **WhatsApp outstanding + invoice**: e-Invoice page "Send on WhatsApp" (invoice) + Ageing/receivables page per-party "Remind" → WhatsApp outstanding modal (pre-filled amount/overdue). Both via existing /whatsapp/send.
- **All-voucher PDF + print bank**: `bank_accounts` table + settings CRUD (`GET/POST /settings/banks`, `PATCH /settings/banks/:id/print`, exclusive default). PDF renderer prints the chosen bank's "Bank details for payment" (bank/A-C/IFSC/branch/UPI) — verified on SI PDF. Voucher list rows: Download/Print open `voucherPdfUrl` (server PDF works for every voucher type). Settings page adds Bank-accounts card + Automation toggle.
- Migration 016 (leave_requests, bank_accounts, companies.auto_einvoice_service) auto-applies on boot. API typecheck + web build pass; verified live (leave apply/approve, bank add + default, auto-IRN, PDF bank block). Merged to main.

### 2026-07-28 — Task 50: WhatsApp PDF attachment + Whitebooks SEK encryption
- **Attach invoice PDF to WhatsApp**: `pdf.helper.ts` `voucherPdfBuffer(companyId, voucherId)` (voucher + company + print-bank → Buffer). WhatsApp `sendWhatsApp` accepts `attachVoucherId`: renders the PDF, sets kind=document; **live** uploads the buffer to Meta `/{phoneId}/media` (multipart Blob) → sends a `document` message with the media id + caption; **sandbox** records it. e-Invoice "Send on WhatsApp" modal has an "Attach invoice PDF" checkbox (default on, passes voucherId). Verified sandbox: log shows kind=document, doc=SI_26-27_0002.pdf, sent.
- **Whitebooks SEK encryption** (`whitebooks-crypto.ts` + wired into `whitebooks.ts`): NIC scheme — random 32-byte AppKey RSA/PKCS1-encrypted with `GSP_PUBLIC_KEY` on auth; response `Sek` AES-256-ECB-decrypted with AppKey → session key; each request payload AES-256-ECB encrypted as `{ Data }`, response `Data` decrypted back. Gated by `GSP_ENCRYPTION=on` (default off — plain JSON, since some GSP tenants handle crypto server-side). Round-trip verified (RSA AppKey, SEK session key, payload all round-trip). Still needs Whitebooks' sandbox to finalise exact payload field names.
- API typecheck + web build pass. Merged to main.

### 2026-07-28 — Task 51: WhatsApp message log page
- New nav "WhatsApp" (Overview) → `/whatsapp`. Page lists every sent message (listWhatsApp): when, to (name+phone), type (Invoice/Reminder/Document/Message), body, attachment (📎 filename), status pill (sent/failed/queued), + KPI tiles + status filter + a "New message" compose modal (sendWhatsApp text). `WhatsAppMsg` type gained `docUrl`. Verified live: 3 prior messages show incl. the document row with SI_26-27_0002.pdf attachment. Merged to main.

### 2026-07-28 — Task 52: Trim Overview nav + notifications See-all page
- Overview nav reduced to **Dashboard only**. Moved Compliance Calendar → GST & Returns; Documents + WhatsApp → Admin group. Deleted the demo pages `app/widgets` + `app/ui` (and their hrefFor entries); getWidgets API left in place (unused).
- New full **`/notifications`** page (tabs All/Tasks/Alerts, mark-all-read, day-grouped, empty state). Notification drawer now shows the recent 6 and its footer **"See all"** button closes the drawer and routes to `/notifications` (useRouter). Verified: See-all → /notifications; Compliance under GST; Documents+WhatsApp under Admin. Merged to main.
