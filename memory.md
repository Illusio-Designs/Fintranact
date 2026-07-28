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
- [x] **Purchase invoice composer** (`modules/purchase`): high-level `{party, placeOfSupply, items[{purchaseLedgerId,taxable,gstRate}], tdsRate?}` → balanced voucher (Dr expense + Input CGST/SGST/IGST; Cr TDS Payable when deducted; Cr supplier = total−TDS). Migration `007_purchase_ledgers.sql` seeds `tds_payable` + `expense_purchase`. Math verified to balance (intra/inter/with-194Q/multi-item). Route `POST /api/v1/invoices/purchase`.
- [ ] Web screens for ledger create + voucher pass-entry against live API; period locks; day book/trial-balance; Process/Rate masters CRUD

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
