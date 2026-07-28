# Fintranact — Product Requirements Document (PRD)

**Product:** Fintranact — Indian Accounting, GST/TDS/TCS Compliance, Job Work & Payroll Platform
**Document type:** Product Requirements Document (PRD)
**Version:** 1.0
**Status:** Draft for engineering & stakeholder review
**Owner:** Product Management
**Last updated:** 2026-07-27
**Target market:** Indian MSMEs, mid-market manufacturers, trading houses, and professional services firms

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Non-Goals](#3-goals-and-non-goals)
4. [User Personas](#4-user-personas)
5. [Feature List by Module](#5-feature-list-by-module)
6. [Detailed Workflows](#6-detailed-workflows)
7. [Security and Access Control Requirements](#7-security-and-access-control-requirements)
8. [System Architecture Proposal](#8-system-architecture-proposal)
9. [Database Design Overview](#9-database-design-overview)
10. [API Design Overview](#10-api-design-overview)
11. [Frontend Architecture and Shared UI Library Plan](#11-frontend-architecture-and-shared-ui-library-plan)
12. [Folder/Module Structure (with `Ravi Matel`)](#12-foldermodule-structure-with-ravi-matel)
13. [Scalability and Performance Considerations](#13-scalability-and-performance-considerations)
14. [Risk Analysis](#14-risk-analysis)
15. [MVP Scope](#15-mvp-scope)
16. [Phased Development Plan (Frontend + Backend + Windows App) — with Team Skills & Claude Skills](#16-phased-development-plan-frontend--backend--windows-app)
17. [Acceptance Criteria](#17-acceptance-criteria)
18. [Open Questions](#18-open-questions)
19. [Appendix A — Stated Assumptions](#appendix-a--stated-assumptions)
20. [Appendix B — Glossary of Indian Compliance Terms](#appendix-b--glossary-of-indian-compliance-terms)

---

## 1. Product Overview

### 1.1 Summary

**Fintranact** is a secure, multi-tenant, role-based accounting and payroll platform purpose-built for Indian businesses. It unifies double-entry financial accounting, statutory compliance (GST, TDS, TCS), **job-work / process tracking**, and end-to-end payroll into a single system of record. It is engineered as a production-grade SaaS/ERP product with an enterprise security posture, high-throughput data entry, approval-based financial controls, and a modern, responsive UI.

> **Reference deployment — RAVI Metal Treatment.** The first target customer is a **job-work / heat-treatment processing house**: it receives customers' material, applies a metallurgical **process** (carburising, hardening, annealing, nitriding, coating, …) and returns it, billing **process charges** — it **does not manufacture or sell its own goods**. Accordingly the product's operational core is **inward → process → outward** job-work (with outward driven by the **pending quantity** of inward), Process & Rate masters, and job-card cash/debit memos — not a manufacturing BOM/finished-goods model.

The platform is designed for the realities of Indian operations: multi-company groups, multi-branch (multi-GSTIN) entities, place-of-supply-driven CGST/SGST/IGST computation, reverse charge, e-invoicing (IRN/QR), e-way bills, TDS/TCS sections and challans, PF/ESI/PT statutory payroll, and the audit rigor expected by chartered accountants and statutory auditors.

### 1.2 Vision

To be the default financial and compliance backbone for Indian SMBs and mid-market manufacturers — a system where a data-entry operator can post 200 vouchers an hour with keyboard-only workflows, a finance controller can enforce four-eyes approvals on every payment, and a CA can pull return-ready GSTR/TDS/TCS output without exporting to spreadsheets.

### 1.3 Product Pillars

| Pillar | What it means for Fintranact |
|---|---|
| **Compliance-native** | GST, TDS, TCS, and payroll statutory logic is built into the ledger, not bolted on. Every transaction carries its tax metadata. |
| **Security-first** | Least-privilege RBAC, encryption of sensitive data at rest and in transit, immutable audit trails, and approval gates on financial actions. |
| **Speed of entry** | Keyboard-driven forms, templates, and "single-click multiple work" bulk automation for repetitive back-office operations. |
| **Modular & scalable** | Clean, modular Node.js services and a shared UI library; horizontally scalable; ready for future integrations and analytics. |
| **Trustworthy numbers** | Double-entry integrity, period locks, reconciliation tooling, and reproducible reports. |

### 1.4 Tech Stack (mandated)

- **Backend:** Node.js (TypeScript), modular service architecture.
- **Database:** MySQL 8.x (InnoDB, strict mode) as primary store.
- **Frontend (web):** Next.js (App Router, TypeScript, React Server Components where appropriate).
- **Windows desktop application:** an **Electron** desktop app for Windows that **reuses the same shared UI and calls the same backend APIs** — giving the Tally-like desktop experience Indian accountants prefer, plus local hardware access and offline-capable fast entry. It ships a code-signed **MSI/NSIS installer** with **auto-update**, a **local device bridge** (biometric machines, thermal/laser printers, scanners, weighbridge) over USB/serial/TCP, an **offline cache + sync queue**, and secure local secret storage (Windows DPAPI/keytar). RBAC is still enforced **server-side** — the desktop app is a client, not a trust boundary. (Tauri is a viable lighter alternative; Electron is the default for maximal Node/native reuse.)
- **Shared UI library:** A versioned internal component library (`@fintranact/ui`) consumed by the web app, the Windows desktop app, and internal admin/back-office screens — one design system, three surfaces.
- **Supporting infra:** Redis (sessions, cache, queues), object storage (documents/invoices/payslips), a message/queue worker tier for async jobs (returns, bulk actions, e-invoice IRN calls).

---

## 2. Problem Statement

Indian businesses today juggle a fragmented stack to stay compliant and operational:

1. **Compliance is fragmented and manual.** Accounting is done in one tool (often desktop Tally or spreadsheets), GST returns are prepared in a separate utility or by the CA, TDS/TCS is tracked in Excel, and payroll runs in yet another system. Data is re-keyed across systems, causing reconciliation pain and filing errors.

2. **GST complexity is under-served.** Correct CGST/SGST/IGST split depends on place of supply and the buyer/seller state. Reverse charge, e-invoicing (IRN), e-way bills, HSN/SAC-level summaries, and GSTR-1 vs GSTR-3B vs GSTR-2B reconciliation are error-prone when handled outside the accounting core.

3. **TDS/TCS is spreadsheet-driven and audit-risky.** Businesses must deduct TDS under the correct section (e.g., 194C, 194J, 194I, 194Q), track thresholds, deposit via challans (ITNS 281), and file quarterly returns (24Q/26Q/27Q/27EQ). TCS under 206C(1H) on sales above thresholds adds a mirror problem. Manual tracking leads to short-deduction, interest, and penalties.

4. **Manufacturing job work lacks a ledger-native tracking model.** Sending raw material out for job work, tracking what came back, and reconciling material movement (including GST implications under job-work provisions) is poorly supported in generic accounting tools.

5. **Payroll and statutory dues are disconnected from accounts.** Salary structures, attendance, leave, PF/ESI/PT/TDS on salary, reimbursements, and payslips rarely flow cleanly into the general ledger, and statutory outputs (ECR for PF, ESI challan, Form 16/24Q linkage) require manual assembly.

6. **Weak controls and auditability.** Small and mid businesses lack maker-checker approval on payments, granular role permissions, and tamper-evident audit logs — exactly what auditors and internal controls demand.

7. **Slow, clunky back-office UX.** High-volume operations (voucher entry, invoice generation, payment batches) are slow in legacy UIs, with little bulk automation, driving up back-office labor cost.

**Fintranact solves this** by making compliance and controls first-class properties of a single, fast, secure accounting and payroll system of record.

---

## 3. Goals and Non-Goals

### 3.1 Goals

- **G1 — Unified ledger of record.** Provide correct double-entry accounting (chart of accounts, ledgers, vouchers) as the foundation for all modules.
- **G2 — GST compliance in-line.** Auto-compute CGST/SGST/IGST/Cess from place of supply; generate GST-compliant invoices; produce return-ready GSTR-1, GSTR-3B summaries, and GSTR-2B reconciliation; support e-invoicing (IRN/QR) and e-way bills via provider integration.
- **G3 — TDS/TCS compliance in-line.** Section-aware TDS deduction with threshold tracking, TDS payable/receivable ledgers, challan tracking, and return-ready 24Q/26Q/27Q/27EQ data. TCS collection under 206C with ledger handling and reporting.
- **G4 — Job work tracking.** Inward/outward job-work challans, material reconciliation, and stock states (raw / semi-finished / finished).
- **G5 — Payroll end-to-end.** Salary structures, attendance, leave, deductions, reimbursements, payslips, and statutory flows (PF/ESI/PT/TDS), with GL posting.
- **G6 — Controls & approvals.** Configurable maker-checker approval workflows for sensitive financial actions (payments, journal edits, credit notes, payroll disbursement).
- **G7 — Security & audit.** Enterprise-grade RBAC, encryption of sensitive fields, secure sessions, and immutable audit logs for every critical action.
- **G8 — Multi-entity.** Multi-company and multi-branch/multi-GSTIN support with per-entity books and consolidated views.
- **G9 — Speed & automation.** Keyboard-first fast data entry and one-click bulk operations for repetitive tasks.
- **G10 — Scalable, modular architecture.** Clean code, modular services, shared UI library, future-ready for integrations and analytics.

### 3.2 Non-Goals (for v1)

- **NG1 — Not a full-blown ERP.** No manufacturing MRP/production planning, no CRM, no procurement RFQ, no fixed-asset depreciation engine beyond a basic register (Phase 2+).
- **NG2 — Not a bank.** No payment initiation/settlement rails in MVP (bank integration is read/reconcile-first; payment file export like bulk NEFT is Phase 2).
- **NG3 — Not a direct GSTN/TRACES filer in MVP.** Fintranact produces return-ready data and JSON/CSV exports; direct filing is via GSP/ASP integration (Phase 2), with export in MVP.
- **NG4 — No global tax engine.** India-first only; multi-country tax is out of scope.
- **NG5 — Windows desktop is in scope; other native clients are not (yet).** The product ships a **Windows desktop app** (Electron) alongside the responsive web app from the foundation phase onward. macOS/Linux desktop builds and a **native mobile app** are Phase 2+.
- **NG6 — Not a statutory/legal advisor.** The system encodes rules and rates but is not a substitute for a CA; users configure/verify rates.

---

## 4. User Personas

| # | Persona | Role in system | Primary goals | Key pain today |
|---|---|---|---|---|
| P1 | **Data Entry / Accounts Operator** ("Suresh") | Maker | Post vouchers, create invoices, capture bills fast | Slow forms; repetitive re-entry |
| P2 | **Accountant / Sr. Accountant** ("Priya") | Maker/Reviewer | Reconcile ledgers, GST/TDS working, month-end close | Cross-tool reconciliation, manual tax working |
| P3 | **Finance Controller / CFO** ("Rajesh") | Approver/Admin | Enforce controls, approve payments, view dashboards | No approval gates, no real-time visibility |
| P4 | **Company Admin / Owner** ("Meena") | Tenant Admin | Configure company, users, roles, branches | Everything requires the CA; poor self-service |
| P5 | **Chartered Accountant (external/auditor)** ("CA Anand") | Auditor (read + limited) | Pull return-ready reports, audit trail, GSTR/TDS output | Data lives in silos; hard to trust/trace |
| P6 | **HR / Payroll Manager** ("Kavita") | Payroll Maker/Approver | Run payroll, manage attendance/leave, payslips, statutory | Payroll disconnected from accounts |
| P7 | **Employee** ("Amit") | Self-service | View payslips, apply leave, submit reimbursements | No self-service portal |
| P8 | **Store / Production Supervisor** ("Farhan") | Job-work Maker | Issue/receive job-work material, track stock states | Excel-based, no GST-aware challans |
| P9 | **Platform / System Admin (internal)** ("Ravi Matel — platform ops")* | Super Admin | Tenant provisioning, monitoring, support tooling | Needs safe, audited back-office tooling |
| P10 | **Compliance Officer** ("Nisha") | Approver/Reviewer | Ensure filings, thresholds, and deadlines are met | No single compliance calendar |

\* The internal back-office/admin module lives under the mandated `Ravi Matel` namespace (see §12). It is operated by internal platform staff, not tenant users.

---

## 5. Feature List by Module

Each module lists capabilities and the roles that typically interact with it. Roles are configurable (§7).

### 5.1 Chart of Accounts (CoA)
- Hierarchical CoA with **groups → ledgers** (Tally-familiar model: Assets, Liabilities, Income, Expenses, plus statutory sub-groups).
- India-ready default templates (e.g., Duties & Taxes group with GST/TDS/TCS ledgers, Sundry Debtors/Creditors, Bank/Cash).
- Per-company CoA; branch-level cost centers/dimensions.
- Ledger attributes: opening balance, Dr/Cr nature, GST applicability, TDS/TCS applicability, PAN/GSTIN (for parties), MSME status.
- Account locking, merge, and rename with full audit.
- Roles: Admin (create/edit), Accountant (edit non-structural), Operator (read/select).

### 5.2 Ledger Management
- Party ledgers (customers/vendors/job-workers) with GSTIN, PAN, MSME/Udyam, TDS section defaults, credit limits.
- **Ledger categories:** every ledger is tagged to a configurable category (e.g., Customer, Supplier, Job-Worker, Transporter, Expense, Bank, Cash, Statutory, Employee-related) driving default behaviour, reports, and filtered pickers during voucher entry. Categories are a master (§5.17) — add/rename/deactivate with audit.
- **Multi-address management:** a single ledger can hold **multiple addresses** — Registered/Billing, one or more Shipping/Delivery, and Works/Plant addresses — each with its own GSTIN, state (place-of-supply), contact person, phone, and email. One address per type is marked default; on a voucher/challan the user picks which billing and which delivery address applies (dropdown), and the correct GSTIN + place of supply flow into the GST computation.
- **Blacklist option:** a ledger can be **blacklisted/flagged** (e.g., defaulter, disputed, credit-hold, statutory-blocked) with reason, effective date, and the user who set it. Blacklisted parties are visibly marked and, per policy, **blocked from new transactions** (hard block) or **warned + approval-gated** (soft block); removing a blacklist is approval-gated and audited.
- Ledger statements with running balance, drill-down to vouchers.
- Opening balances and carry-forward across financial years (Apr–Mar).
- Bill-wise / reference-wise tracking (outstanding, ageing).
- Bank & cash ledgers with reconciliation status.
- Multi-currency capture at ledger level (INR base; forex optional/Phase 2).
- Roles: Accountant/Admin (create/edit), Controller (approve blacklist add/remove), Operator (select).

### 5.3 Vouchers
- Voucher types: **Payment, Receipt, Contra, Journal, Sales, Purchase, Debit Note, Credit Note**, plus configurable custom types.
- Double-entry enforcement (debits = credits); multi-line entries; narration; attachments.
- Voucher numbering series per company/branch/type with format templates and gap detection.
- Cost center / dimension tagging.
- Recurring vouchers (rent, EMI, salaries) with schedules.
- Draft → Posted → Approved states; period-lock enforcement.
- Keyboard-first entry (see §6.1) and voucher templates for repetitive entries.
- Roles: Operator/Accountant (create draft/post), Controller (approve where required).

### 5.4 Invoicing
- Tax invoice, Bill of Supply, Export invoice (with/without payment of tax), SEZ, RCM invoice.
- Item/service lines with **HSN/SAC**, quantity, rate, discount, taxable value.
- Auto tax computation by place of supply (CGST+SGST intra-state; IGST inter-state; Cess where applicable).
- Rounding, additional charges (freight/packing) with their own GST treatment.
- Invoice templates (branding, T&C, bank details, UPI/QR).
- PDF generation, email/share, and print.
- Credit/debit note linkage to original invoice.
- Roles: Operator/Accountant (create), Controller (approve high-value/credit notes).

### 5.5 Purchase and Sales
- **Sales:** quotation → sales order (optional) → delivery/challan (optional) → tax invoice → receipt. Bulk invoice generation from orders.
- **Purchase:** purchase order (optional) → GRN (optional) → purchase bill → payment; ITC eligibility flags per line.
- Price lists, item masters, tax defaults per item/party.
- Ageing, outstanding, and reminder workflows.
- ITC tracking on purchases (eligible/ineligible/blocked credit u/s 17(5)).
- Roles: Operator (entry), Accountant (verify), Controller (approve payments).

### 5.6 GST Invoice Generation
- GST-compliant invoice format (all mandatory fields: supplier/recipient GSTIN, place of supply, HSN, tax breakup, reverse-charge flag, IRN & signed QR when e-invoiced).
- **E-invoicing:** generate IRN and signed QR via GSP integration for eligible turnovers; cancel IRN within window; store signed JSON.
- **E-way bill:** generate/associate EWB for goods movement above threshold (₹50,000), with transporter/vehicle details; consolidated EWB.
- Reverse charge (RCM) handling on eligible inward supplies (self-invoice).
- Multi-GSTIN: invoice issued under the correct branch GSTIN.
- Roles: Operator/Accountant (generate), Controller (approve cancellations).

### 5.7 GSTR Reports and GST Workflow
- **GSTR-1** working: B2B, B2C(L/S), exports, credit/debit notes, HSN summary, document series — return-ready, exportable as GSTN-compatible JSON/CSV.
- **GSTR-3B** summary: outward taxable, ITC, tax payable/liability, RCM, computed from books.
- **GSTR-2B reconciliation:** import 2B (JSON/Excel), match against purchase register, flag mismatches (missing in books, missing in 2B, value/tax diff), and ITC eligibility decisions.
- HSN/SAC summary and rate-wise tax summary.
- GST liability ledger and set-off simulation (IGST → CGST/SGST utilization order).
- Compliance calendar with due-date reminders (11th/20th/etc.).
- Roles: Accountant (prepare), Compliance Officer/Controller (review & lock working).

### 5.8 TDS — Deduction, Payable/Receivable, Challans, Returns
- **Section-aware deduction:** configurable sections (194C, 194J, 194I, 194H, 194Q, 192, 194A, etc.) with rates, thresholds (single & cumulative annual), and higher-rate handling for no-PAN / 206AB non-filers.
- Auto-deduct TDS at bill booking or payment (configurable point of deduction) with lower/nil deduction certificate (u/s 197) support per party.
- **TDS Payable** (we deduct on vendor payments) and **TDS Receivable** (customers deduct on our income — tracked for 26AS reconciliation and refund/credit).
- **Challan tracking:** ITNS 281 challans — challan number, BSR code, deposit date, amount, section — linked to deducted entries; interest on late deposit calculation.
- **Return-ready output:** deductee-wise data for **24Q** (salary), **26Q** (non-salary resident), **27Q** (non-resident); certificate references (Form 16/16A) and quarter mapping.
- 26AS / AIS reconciliation for TDS receivable.
- Roles: Accountant (deduct/prepare), Compliance Officer (verify challan & return), Controller (approve).

### 5.9 TCS — Collection, Ledger, Compliance
- **TCS collection** under Section 206C (including **206C(1H)** on sale of goods above ₹50 lakh/PAN threshold, and other 206C categories where relevant).
- Threshold tracking per buyer PAN (aggregate in FY); auto-add TCS line on eligible sales invoices.
- **TCS ledger handling:** TCS Payable (collected, to be deposited) and TCS Receivable (collected from us by suppliers) for credit/reconciliation.
- Challan tracking (ITNS 281) and **27EQ** return-ready quarterly output; Form 27D certificate references.
- Interplay guard: avoid double application of TDS 194Q and TCS 206C(1H) on the same transaction per rules (configurable precedence).
- Roles: Accountant (collect/prepare), Compliance Officer (verify), Controller (approve).

### 5.10 Job Work Management (core business — processing house)

> **Business context.** RAVI Metal Treatment is a **job-work / heat-treatment processing house** — it receives customers' material, applies a **process** (carburising, hardening & tempering, annealing, nitriding, surface coating, etc.), and returns the processed material, billing **job-work/process charges**. The company **does not manufacture or sell its own finished goods**, so the model is inward → process → outward against the customer, plus the mirror flow when work is sub-let to another job-worker.

- **Inward (customer → us) — carries the Cash/Debit memo:** when customer material is received under a job-work/delivery challan, the operator captures customer, material, quantity, UoM, incoming challan ref, the **process** to be applied (from **Process Master**, §5.17), the **rate** (from **Rate Master**), and the **memo type — Cash or Debit (credit/account)**. The charge is decided and booked at inward:
  - **Cash memo** → charges collected on delivery; a **receipt** is raised, no receivable is created.
  - **Debit memo** → charges billed to the customer's ledger (on account), added to receivables and settled later (with GST on SAC 9988 and **TDS 194C** where the customer deducts).
  The memo type lives on the **inward entry**, not on a separate job card. Pending-to-return is set to the received quantity.
- **Outward (us → customer):** dispatch processed material back — **purely a physical movement against the pending quantity** of the linked inward (the charge was already booked at inward). The system tracks, per inward challan/line, `received − already returned − loss = pending`, and an outward challan can only dispatch **up to the pending quantity** (partial dispatches allowed across multiple outward challans until pending = 0). Handling/burning-loss is captured so `returned + loss + pending` reconciles to the received quantity. The same pending-quantity logic governs material we **sub-let** to another job-worker (our outward → their inward, their return reduces our pending).
- **Rate & charge computation:** process charges are picked from **Rate Master** (§5.17) — rate per kg / per piece / per lot by process + customer (contract rate) — and auto-computed at inward (qty × rate), with GST on job-work charges (SAC 9988). A **Job Card** remains available as a process-tracking/traveller document (process, in/out quantities, status) but does **not** own the cash/debit decision.
- **Pending / ageing views:** live "pending inward" and "pending outward" registers, plus statutory ageing (1-year/3-year job-work return norms) and alerts on overdue material.
- **ITC-04** supporting data for goods received-for-processing and returned; e-way bill on movement where applicable.
- **Lien & forfeiture of customer material against unpaid dues:** when a customer's outstanding is **overdue beyond a configured period** and their material is still lying in our custody, the system links the two and enables a **processor's-lien recovery** flow (bailee's particular lien, Indian Contract Act §170):
  - It flags eligible cases (overdue amount + material value in custody) and requires a **formal notice** reference plus **approval + signing PIN** before anything moves — this is someone else's property, so the action is tightly controlled and fully audited.
  - On forfeiture, the material moves from **customer-custody (off-books) → our "Recovered Goods / Scrap" inventory (on-books)** at an assessed realizable value, and the customer's receivable is reduced accordingly.
  - The recovered goods can then be **sold** (tax invoice to a scrap/third-party buyer, output GST) to **collect revenue**, and the net proceeds are **applied against the customer's outstanding**: a **surplus** becomes refundable to the customer (liability), a **shortfall** stays receivable and may be written off as bad debt (approval-gated).
- Roles: Store/Process Supervisor (inward/outward, job card), Accountant (charges/GST/TDS, forfeiture entries), Controller/Owner (approve forfeiture, write-offs, rate overrides).

### 5.11 Inventory & Material Master (job-work model)
- **Item / Material Master** (§5.17): items are primarily **customer material received for processing** (identified by customer + grade/description + UoM + HSN) and **own consumables** (furnace LPG/gas, quenching oil, salts, packing) — **not** own finished goods, since the company does not manufacture.
- **Stock by custody/location:** material tracked as **In customer custody / Received (in-plant, awaiting or under process) / Dispatched-back**, and, when sub-let, **In job-worker custody** — rather than a manufacturing RM→SFG→FG ladder.
- Consumables inventory with UoM, reorder level, valuation (Weighted Avg default), and issue-to-process consumption.
- Stock/movement ledgers and material-position reports feed the job-work pending/ageing views.
- Roles: Store Supervisor (movements), Accountant (consumable valuation), Controller (adjustment approval).

*(Inventory in MVP is lightweight — quantity + custody position + consumable valuation to support job work; there is deliberately no manufacturing/BOM/FG module because it is out of this business's scope.)*

### 5.12 Payroll Processing
- Employee master (PAN, Aadhaar (masked/encrypted), UAN, ESIC IP number, bank details, DoJ, designation, branch).
- **Salary structure:** components (Basic, HRA, conveyance, special allowance, employer PF/ESI, etc.), formula-based, CTC ↔ gross ↔ net.
- **Payroll run:** monthly cycle, prorated for joiners/leavers, arrears, one-time payments.
- **Deductions:** PF (employee/employer), ESI, Professional Tax (state-wise), TDS on salary (192, old/new regime), loans/advances.
- **Reimbursements:** claim submission, approval, and payout (taxable/non-taxable treatment).
- **Payslips:** generated PDF, employee self-service download.
- **Statutory outputs:** PF ECR text file, ESI contribution file/challan data, PT returns, Form 12BB investment declarations, and **auto-generated Form 16** (see below).
- **Form 16 — auto-generation (TDS on salary, u/s 203):** at year-end the system produces each employee's **Form 16**:
  - **Part A** (deductor/employee identity — TAN, employer & employee **PAN**, address, AY & period, and the **quarter-wise TDS deducted & deposited** with challan/BSR references) is reconciled from the **24Q** returns / TRACES linkage.
  - **Part B (Annexure)** is **computed automatically from the payroll**: gross salary [17(1)/(2)/(3)], allowances exempt u/s 10 (HRA, etc.), deductions u/s 16 (standard deduction, professional tax), income under *Salaries*, Chapter VI-A deductions (80C/80D/…), total income, tax on total income, rebate 87A, surcharge & **health-&-education cess**, relief u/s 89, and **net tax deducted** — supporting **old and new regime**.
  - **Bulk one-click generation** for all employees, **digitally signed** (DSC / signing PIN), each PDF **password-protected** (PAN + DOB) and **auto-filed to the document root** and emailed to the employee. Regeneration keeps a version; every issue is audit-logged.
- GL posting: salary journal auto-posted to accounts (salary expense, statutory payables, net-pay bank).
- Roles: Payroll Manager (run), Controller/Compliance (approve & disburse), Employee (self-service).

### 5.13 Attendance, Leave, Salary Structure, Deductions, Reimbursements, Payslips, Statutory
- **Biometric attendance integration:** direct connection to **biometric attendance machines** (fingerprint/face/RFID — e.g., ESSL/eSSL, ZKTeco, Matrix and similar). Employees are mapped by **biometric/enrollment ID → employee**; punch logs are ingested (device pull via SDK/API, `.dat`/CSV import, or a push endpoint), de-duplicated, and converted into first-in/last-out, shift, overtime, and LOP. Multi-device and multi-branch supported; unmapped punches are queued for review. Manual override with reason (audited) for missed/erroneous punches.
- **Attendance:** biometric-first, with manual/import fallback; present/absent/half-day/overtime; LOP (loss of pay) computation from punches and shift rules.
- **Leave:** leave types (CL/SL/EL/comp-off), balances, accrual policies, apply/approve workflow, encashment; leave reconciled against biometric punches.
- **Statutory payroll flows:** PF/ESI/PT registration numbers per entity, monthly generation of ECR/challans, TDS on salary quarterly (24Q), annual Form 16.
- Configurable pay calendar, cut-off dates, and lock after disbursement.
- Roles: Payroll Manager (map devices, run), HR (attendance review), Controller (approve).

### 5.14 Reports and Dashboards
- **Financial:** Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, Day Book, Ledger statements, Ageing (receivable/payable).
- **Profitability — Gross & Net Profit (job-work model):** the P&L is built **live from posted GL entries**, FY-scoped and drill-down, grouped by the *nature* of each ledger's CoA group/category (Direct Income, Direct/Process Cost, Indirect Income, Indirect Expense, Finance Cost, Tax). The engine computes:
  - **Gross Profit = Operating Income (process/job-work charges + scrap/labour) − Direct/Process Cost** (furnace **fuel/gas**, **power**, quenching oil/salts/consumables, **direct wages**, sub-contract job-work, ± consumable **stock movement**).
  - **Net Profit (PBT) = Gross Profit + Indirect Income − Indirect Expenses − Finance Cost**; **Net Profit (PAT) = PBT − Tax provision**.
  - **GP% and NP% margins** are shown against revenue; drill any subtotal to the source vouchers.
  - **Job-work-correct treatment:** **customer material held in custody is excluded** from cost/stock (it was never purchased); **GST/TDS/TCS are Balance-Sheet items, not P&L** (a ₹18,000 charge + ₹3,240 GST books ₹18,000 as income); the **Cash vs Debit memo** choice affects *collection*, not profit (both post the same process-charge income). Recovered-goods (lien) sales and their assessed cost flow through P&L as a small gain/loss.
- **GST:** GSTR-1/3B working, 2B reco, HSN summary, tax liability & ITC.
- **TDS/TCS:** deduction registers, challan status, return-ready summaries, 26AS reco.
- **Payroll:** salary register, statutory summaries, cost-to-company reports, headcount.
- **Role-based dashboard design:** each role sees a **different dashboard**, composed of the widgets relevant to that role, respecting branch/company scope:
  - **Owner/Director** — revenue (job-work charges), receivables, cash position, top customers, compliance status.
  - **Finance Controller** — cash/bank, AR/AP ageing, approvals queue, compliance calendar, GST/TDS liability.
  - **Accountant** — day book, pending vouchers, GST/TDS working, bank reconciliation.
  - **Process/Store Supervisor** — pending inward, pending outward, jobs under process, material ageing, today's job cards.
  - **Payroll/HR Manager** — headcount, today's biometric attendance, leave requests, payroll run status.
  - **Compliance Officer** — due-date calendar, return status, challan deposits, 2B mismatches.
  - Dashboards are **configurable** (widget catalog, drag-arrange, saved per role/user); the layout is driven by the user's role and permissions, and no widget renders data the user isn't authorized to see.
- Export to PDF/Excel/CSV; scheduled report email (Phase 2).
- Roles: all (scoped by permission & branch).

### 5.15 User Management & User-wise Digital Signing
- Invite/onboard users; assign roles and branch/company scope.
- User status (active/suspended), password policy, MFA enrollment.
- Delegation (temporary approver), session revocation.
- **User-wise sign option with a secret PIN:** each user can be enabled to **digitally sign** actions (approving/posting a voucher, authorizing a payment or payroll run, signing off a job card, locking a period). Signing requires the user's own **secret signing PIN** — a step-up secret **separate from the login password**, set and changed only by that user, stored **hashed (never in plaintext)**, and never shared. A successful sign stamps the record with the signer's identity, role, timestamp, and a signature reference; the signed PIN gates the action so approvals cannot be performed without it. PIN attempts are rate-limited and lock after repeated failure; every sign/failed-sign is audit-logged. (Optional Phase 2: bind to a digital signature certificate / DSC for statutory documents.)
- Roles: Tenant Admin (manage users, enable signing), each user (set/rotate own PIN), Controller (view sign log).

### 5.16 Permissions and Audit Trail
- Role builder with granular permissions per module/action (§7).
- **Immutable audit log** of every critical action (create/edit/delete/approve/login/export) with actor, timestamp, before/after snapshot, IP, and device.
- Audit search, filter, and export for auditors.
- Roles: Admin/Compliance (view), Auditor (read).

### 5.17 Masters & Configuration
All operational data is driven by versioned, effective-dated masters so day-to-day entry stays fast and consistent, and rules change by configuration rather than code.

- **Financial Year management:** define and manage financial years (India **Apr–Mar**); open/active/closed states; **year-end close & carry-forward** of ledger balances and stock/pending positions into the new FY; period locks within a year; the ability to work in a new FY while the previous one is being finalised; and controlled, approval-gated **reopen** of a closed year. All documents, numbering series, and reports are FY-scoped.
- **Ledger Categories master:** the category catalog (Customer, Supplier, Job-Worker, Transporter, Expense, Bank, Cash, Statutory, Employee-related, …) used to classify ledgers (§5.2), driving pickers, defaults, and grouped reports.
- **Item / Material Master:** customer materials (grade/description, UoM, HSN) and own consumables (§5.11); default process and rate linkage where applicable.
- **Process Master:** the catalog of processes the plant offers — **Carburising, Hardening & Tempering, Annealing, Normalising, Nitriding, Induction Hardening, Surface/Zinc Coating, Stress Relieving,** etc. Each process carries a code, description, SAC (9988 for job-work services), default UoM (per kg / per piece / per lot), standard cycle/turnaround, and status. Used on inward, job cards, and rate lookup.
- **Rate Master:** charge rates for **process × UoM × customer** — standard rates plus **customer-specific contract rates**, effective-dated (valid-from/valid-to), with optional slab/min-charge and GST rate. The job card and job-work billing auto-pick the applicable rate (contract rate overrides standard); rate overrides on a job are approval-gated and audited.
- **Other masters:** numbering series, cost centres, tax rates, TDS/TCS sections, PT slabs, banks, UoM, address types, approval thresholds.
- Roles: Admin/Accountant (maintain masters), Controller (approve rate/FY-close/reopen), Operator (consume via pickers).

### 5.18 Document Management & Uploads (Document Root)
A built-in document store so every record can carry its supporting paperwork, with a central, secure per-tenant **document root** as the single source of truth for files.

- **Attach to any record:** upload and attach documents to vouchers/invoices/bills, party ledgers, inward/outward & job cards, GST returns & e-invoice/e-way PDFs, TDS/TCS **challans**, payroll/employee records, **lien notices**, and masters. Multiple files per record, each with a **document type** (e.g., Purchase Bill, GST Certificate, PAN, e-Way Bill, Weighment Slip, Lien Notice, KYC, Bank Proof) and notes.
- **Document Root (repository):** a per-tenant root organised as a tree — **Company → Branch/GSTIN → Financial Year → Module → Entity** — so files are addressable and consistently filed. A central **Documents** browser lets users search, filter (by type/date/party/module), preview, and download; recent and pinned documents surface quickly.
- **Auto-filed system documents:** generated artefacts (invoice/e-invoice PDF with IRN-QR, e-way bill, payslip, challan, return JSON/CSV, forfeiture/scrap invoice) are **auto-saved into the document root** and linked to their record — no manual upload needed.
- **Supported files & limits:** PDF, images (JPG/PNG), Office/CSV, XML/JSON; configurable per-file **size limit** and allowed MIME types; drag-and-drop and **bulk upload** with per-file result log; client + server validation.
- **Versioning & lifecycle:** re-uploading keeps **version history** (who/when), supports supersede/replace, soft-delete with recovery window, and **retention policies** (align to statutory ≥ 8 years); expiry reminders for documents that lapse (e.g., certificates).
- **Security (first-class):** files stored in **encrypted object storage** under the tenant's isolated document root; access is **RBAC-scoped** (a user sees a document only if permitted on its parent record and branch); downloads use **short-lived signed URLs** (never public); every upload/view/download/delete is **audit-logged**; uploads pass **malware/virus scanning** and type/size checks; sensitive documents (PAN/Aadhaar/bank) are access-restricted and masked in listings. No file is served without an authorization check.
- **Search & OCR:** metadata/full-text search across filenames, types, tags, and linked party; **OCR text extraction** for scanned bills/challans to make them searchable (Phase 2), feeding future auto-capture/reconciliation.
- Roles: Operator/Accountant (upload/attach), all (view within permission scope), Controller/Admin (delete/retention), Auditor (read + audit).

---

## 6. Detailed Workflows

### 6.1 Fast Voucher Entry (Speed of Entry)
1. Operator opens **New Payment Voucher**; cursor auto-focuses the party field.
2. Type-ahead search resolves ledger (Alt+shortcut to create on the fly).
3. Amount entry auto-balances the counter-ledger; TDS auto-suggested if party/section applicable (e.g., 194C @ 1%/2%) — shown inline, editable.
4. `Ctrl+Enter` saves and opens the next voucher (same type) preserving date/series — enabling rapid batch entry.
5. Voucher template can pre-fill common entries (e.g., monthly rent with TDS 194I).
6. All keyboard-navigable; no mouse required. Validation errors are inline and non-blocking until save.

### 6.2 GST Sales Invoice with E-Invoice & E-Way Bill
1. Accountant creates a sales invoice under Branch GSTIN (say, Maharashtra).
2. System reads **place of supply**; if buyer is in Maharashtra → CGST+SGST; if in Gujarat → IGST.
3. Line items carry HSN and GST rate; tax auto-computed; Cess if applicable.
4. On save, if turnover mandates e-invoicing, the system calls GSP → returns **IRN + signed QR**, embedded in the PDF.
5. If goods > ₹50,000, prompt for **e-way bill** (transporter/vehicle) → EWB number stored.
6. Invoice posts to sales, output GST payable, and party receivable ledgers automatically.
7. If value exceeds a configured threshold, invoice may route through **approval** before dispatch.

### 6.3 TDS Deduction on Vendor Bill (Maker-Checker)
1. Operator books a contractor bill of ₹1,00,000 under section 194C.
2. System checks party's cumulative payments vs threshold (single ₹30,000 / annual ₹1,00,000); if crossed, computes TDS (1% individual / 2% others); if no PAN → 20%.
3. Bill posts: expense Dr, TDS Payable Cr, Vendor Cr (net).
4. **Approval:** payment of the net amount routes to Controller (four-eyes) before release.
5. At month-end, TDS Payable is aggregated by section; a **challan (ITNS 281)** is recorded on deposit; entries are marked "deposited" with challan reference.
6. Quarter-end: **26Q** deductee-wise data is generated; Form 16A references produced.

### 6.4 TCS on Sales under 206C(1H)
1. Accountant raises a sales invoice to a buyer whose aggregate FY sales cross ₹50 lakh.
2. System auto-adds a **TCS @ 0.1%** line on the amount exceeding the threshold (higher if no PAN).
3. Guard checks whether buyer is already deducting **TDS 194Q**; if so, TCS is suppressed per configured precedence.
4. TCS Payable ledger credited; collected TCS tracked for **27EQ** and challan deposit.

### 6.5 GSTR-2B Reconciliation
1. Accountant imports GSTR-2B (JSON/Excel) for the period.
2. System matches each 2B line against the purchase register by GSTIN + invoice no + value + tax (fuzzy tolerance configurable).
3. Buckets: **Matched**, **Mismatch (value/tax)**, **In 2B not in books**, **In books not in 2B**.
4. Accountant resolves each; ITC is claimed only for eligible matched lines; unresolved ITC is deferred.
5. Working is reviewed and **locked** by Compliance Officer; GSTR-3B ITC figure is derived from the locked reco.

### 6.6 Job Work Inward → Process → Outward (against pending quantity)
1. Store Supervisor books an **inward** entry: Customer *Mahalaxmi Traders* sends **1,000 kg** of gears for **Carburising** (process from **Process Master**). On the **same inward** the operator sets the **memo type — Debit** (bill to ledger) or **Cash** (collect on delivery), and the **rate auto-picks from Rate Master** (say ₹18/kg → charge ₹18,000 + GST). Charge posts here: *Debit* → customer receivable + output GST (+ **TDS 194C** where deducted); *Cash* → receipt on delivery. Pending-to-return = 1,000 kg; ageing starts.
2. Material is processed; **burning/handling loss 20 kg** is recorded.
3. First **outward** dispatch returns **600 kg** — checked against **pending (1,000 kg)** and allowed; pending becomes **380 kg** (`1000 − 600 − 20 loss`). Outward is a physical movement only (no re-billing).
4. A second outward later returns the remaining 380 kg; **cumulative outward + loss can never exceed pending**, and the job closes when pending = 0.
5. **ITC-04** and pending/ageing registers update throughout; any short/excess reconciles as loss (approval-gated).

### 6.7 Monthly Payroll Run (with Approval & GL Posting)
1. Payroll Manager locks attendance/leave for the cycle; LOP computed.
2. System calculates gross, deductions (PF/ESI/PT/TDS), reimbursements, and net pay per employee.
3. **Approval:** payroll register routes to Controller; variance vs last month highlighted.
4. On approval, salary **journal is posted** to GL; statutory payables created.
5. Bank payout file/summary generated (export in MVP); payslips published to self-service.
6. Statutory outputs: **PF ECR**, **ESI** contribution, **PT**, and **24Q** data staged for filing.

### 6.8 Month-End Close & Period Lock
1. Accountant completes reconciliations (bank, GST, TDS/TCS, payroll).
2. Controller reviews Trial Balance and exception reports.
3. Controller **locks the period**; further edits require a formal reopen (audited, approval-gated).

### 6.9 Bulk / "Single-Click Multiple Work" Automation
- **Bulk invoice generation** from multiple sales orders.
- **Bulk payment run:** select N approved vendor bills → generate one payment batch (and bank file/export) in one click.
- **Bulk e-invoice/e-way** generation for a day's invoices.
- **Bulk TDS challan** creation grouped by section.
- **Bulk payslip** publish and **bulk reminder** emails (AR ageing).
- **Bulk import** of ledgers, items, opening balances, employees via validated templates.
- All bulk actions run as **background jobs** with progress, per-row success/failure, and a downloadable result log; failures are retriable; every bulk action is fully audited.

### 6.10 Recovering an Overdue via Lien on Customer Material (forfeiture → sell → adjust)
1. Customer *Shree Balaji* owes **₹1,04,200** (overdue 95 days). Their **500 kg of shafts** are still in our custody (job done, not collected). The system flags the case: overdue amount + material in custody.
2. Accountant records the statutory **notice** (reference/date); Controller/Owner **approves** the lien and **signs (PIN)** — the action is audited (it is the customer's property).
3. **Forfeiture** posts: material moves from custody to **Recovered Goods / Scrap (inventory)** at an assessed realizable value (say ₹90,000), and the customer's receivable is reduced by that amount.
4. **Sale** of the recovered goods: a **tax invoice** is raised to a scrap buyer for **₹98,000 + GST**; revenue is booked, output GST charged, and the goods leave stock (small gain to P&L).
5. **Settlement:** net proceeds are applied to the outstanding. Realized ₹98,000 vs due ₹1,04,200 → **shortfall ₹6,200** remains receivable (written off as bad debt with approval if irrecoverable). Had proceeds exceeded the due, the **surplus would be refundable to the customer** (liability).
6. Every step (flag → notice → approval+sign → forfeiture → sale → settlement) is on the **audit trail**; the customer ledger shows the full recovery history.

---

## 7. Security and Access Control Requirements

Fintranact adopts a **security-first, defense-in-depth** posture. "100% secure" is treated as a design *mindset* — we implement layered controls, least privilege, and continuous verification (with the honest engineering caveat that no system is provably unbreakable; see Risk R7).

### 7.1 Authentication & Session Management
- Email/username + strong password (Argon2id/bcrypt hashing, per-user salt, pepper in secret store).
- **Mandatory MFA** for privileged roles (Admin, Controller, Compliance, Payroll); TOTP-based, with recovery codes.
- **Session management:** short-lived access tokens (JWT) + rotating refresh tokens stored server-side (Redis) with device binding; idle and absolute session timeouts; concurrent-session limits and one-click "revoke all sessions."
- Secure cookies (`HttpOnly`, `Secure`, `SameSite=strict`), CSRF protection (double-submit/synchronizer token), and re-authentication ("step-up") for sensitive actions (payments, payroll disbursement, permission changes).
- Account lockout / rate-limit on failed logins; suspicious-login alerts.
- SSO (SAML/OIDC) for enterprise tenants — Phase 2.

### 7.2 Authorization — RBAC (Role-Based Access Control)
- **Roles → Permissions → Resources.** Permissions are granular tuples: `{module}:{action}` (e.g., `voucher:create`, `payment:approve`, `payroll:run`, `gst_return:lock`, `report:export`, `user:manage`).
- **Configurable permissions by role:** Tenant Admin composes custom roles from the permission catalog; system ships sensible defaults.

#### 7.2.1 Default Role List
| # | Role | Purpose | Representative permissions |
|---|---|---|---|
| R1 | **Tenant Admin / Owner** | Full control of the company, users, masters, and settings | `*` within tenant (own data); user/role mgmt; masters; view all |
| R2 | **Finance Controller** | Approvals, controls, cash & compliance oversight | approve payments/payroll/notes; period lock; view all; sign |
| R3 | **Accountant** | Day-to-day books, vouchers, GST/TDS working, reconciliation | voucher CRUD; invoice/bill; gst/tds working; bank reco; no approve |
| R4 | **Data-Entry Operator** | Fast voucher/inward entry, cash memos | voucher create (draft/post); inward; limited masters (read) |
| R5 | **Process / Store Supervisor** | Job-work floor: inward, outward, job cards, material | jobwork inward/outward; job card; stock; no financial approve |
| R6 | **Payroll / HR Manager** | Attendance (biometric), payroll, leave, statutory | employee/salary; attendance; payroll run; leave approve |
| R7 | **Compliance Officer** | GST/TDS/TCS returns, due dates, challans | return prepare/lock; challan; 2B reco; view compliance |
| R8 | **Auditor** (read-only) | Independent review, no edit | read-only: reports, ledgers, **audit trail**, sign log |
| R9 | **Employee** (self-service) | Own payslips, leave, reimbursements | self: payslip view; leave apply; reimbursement submit |

Roles are **configurable** (add/rename/compose from the permission catalog) and **scoped by company/branch/GSTIN**; a user may hold different roles in different branches.

#### 7.2.2 Role-wise Dashboard Plan (what each role sees)
Each role lands on a **different dashboard** — KPI tiles + a widget set — rendered from role + permissions (a widget never shows data the user can't access):

| Role | KPI tiles (4) | Widgets |
|---|---|---|
| **Owner / Director** | Job-work revenue · Gross profit · Receivables · Cash | P&L (gross/net) · Cash-flow chart · Top customers · Compliance status |
| **Finance Controller** | Cash & Bank · Receivables (overdue) · Payables · GST liability | Cash-flow chart · Compliance calendar · Approvals queue · Recent vouchers |
| **Accountant** | Vouchers today · Pending approval · Bank unmatched · 2B mismatches | Recent vouchers · Cash-flow chart · Compliance calendar · Approvals |
| **Process Supervisor** | Pending inward · Pending outward · Under process · Overdue return | Pending inward · Pending outward · Overdue-recovery (lien) |
| **Payroll / HR** | Headcount · Present today (biometric) · Leave requests · Payroll status | Biometric attendance · Leave & payroll status |
| **Compliance Officer** | GST liability · TDS payable · Returns due · 2B mismatches | Compliance calendar · Audit trail |
| **Auditor** (read) | Vouchers this month · Signed approvals · Blacklist changes · Period locks | Audit trail · P&L · Recent vouchers (read) |

Dashboards are **configurable** (widget catalog, drag-arrange, saved per role/user).
- **Scoping:** every permission is further scoped by **company** and **branch/GSTIN**, and optionally by **cost center**. A user can hold different roles in different companies/branches.
- **Data-level rules:** row-level filters (e.g., a branch accountant sees only that branch's vouchers); field-level masking (e.g., bank/Aadhaar visible only to authorized roles).
- **Separation of duties:** the maker of a transaction cannot be its sole approver; enforced by policy.
- Enforcement is **server-side on every request** (never trust the client); the UI merely reflects granted permissions.

### 7.3 Approval Workflows (Maker-Checker)
- Configurable approval policies per action and threshold, e.g.:
  - Payments/journals above ₹X → single approver; above ₹Y → dual approvers.
  - Credit notes, ledger deletions, period reopen, permission changes, payroll disbursement → always approval-gated.
- Multi-level approval chains, delegation, SLA/escalation, and full approval history on each record.
- Approvals are audited with actor, decision, comments, and timestamp.

### 7.4 Encryption & Data Protection
- **In transit:** TLS 1.2+ everywhere; HSTS.
- **At rest:** MySQL storage encryption; **application-level field encryption** (AES-256-GCM) for the most sensitive PII/financial fields — bank account numbers, PAN/Aadhaar, salary details, API credentials — with keys held in a KMS/secrets manager and regular rotation.
- **Tokenization/masking** of sensitive fields in UI and logs (e.g., Aadhaar shown as `XXXX-XXXX-1234`).
- Secrets never in source; environment/secret-manager only.
- Backups encrypted; restore drills documented.

### 7.5 Audit Logging (Immutable)
- Every **critical action** logged: create/update/delete/approve/reject, login/logout, permission change, export, bulk action, period lock, e-invoice/challan generation.
- Each entry: actor, role, company/branch, action, entity + id, **before/after snapshot (diff)**, timestamp (UTC), IP, user-agent, request id.
- **Tamper-evidence:** append-only store with hash-chaining (each record includes hash of the previous) so any tampering is detectable; logs are write-once and separately retained.
- Audit retention aligned to statutory needs (≥ 8 years configurable). Auditor role has read-only audit access with search/export.

### 7.6 Application Security Controls
- Input validation & output encoding (prevent SQLi/XSS); parameterized queries/ORM only.
- CSRF, clickjacking (`X-Frame-Options`/CSP), CORS allow-list, security headers via middleware.
- Rate limiting and WAF at the edge; bot/abuse protection on auth endpoints.
- Dependency scanning (SCA), SAST/DAST in CI, secret scanning, and container image scanning.
- Least-privilege infra IAM; network segmentation; DB not publicly reachable.
- Secure SDLC: code review, threat modeling for new modules, periodic penetration testing.

### 7.7 Multi-Tenancy Isolation
- Strict **tenant isolation** — every query is tenant-scoped (`company_id`) at the data-access layer; defense against cross-tenant access via mandatory scoping and tests.
- Optional per-tenant encryption keys for the most sensitive fields.

### 7.8 Privacy & Compliance
- Aligns to India's **DPDP Act 2023** principles: purpose limitation, consent for employee PII, data-subject access/erasure workflows (with statutory-retention overrides), and breach-notification readiness.
- Configurable data residency (India region hosting).

---

## 8. System Architecture Proposal

### 8.1 High-Level Architecture

```
                         ┌─────────────────────────────┐
                         │         Clients             │
                         │  Next.js Web App (Tenant)    │
                         │  Windows Desktop App (Electron)│
                         │   └─ local device bridge:    │
                         │      biometric · printer ·   │
                         │      scanner · offline cache │
                         │  Internal Admin (Ravi Matel) │
                         └───────────────┬─────────────┘
                                         │ HTTPS (TLS) — same APIs
                                 ┌───────▼────────┐
                                 │   Edge / WAF   │  rate-limit, TLS, headers
                                 └───────┬────────┘
                                 ┌───────▼────────┐
                                 │  API Gateway   │  authN, routing, req-id
                                 │  (BFF/Node)    │
                                 └───────┬────────┘
        ┌──────────────┬────────────────┼───────────────┬───────────────┐
        │              │                │               │               │
 ┌──────▼─────┐ ┌──────▼─────┐  ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
 │ Accounting │ │ Compliance │  │  Job Work &  │ │  Payroll    │ │  Platform   │
 │  Service   │ │ Svc (GST/  │  │  Inventory   │ │  Service    │ │  Admin Svc  │
 │(CoA,Ledger,│ │ TDS/TCS)   │  │  Service     │ │ (HR/Salary) │ │(Ravi Matel) │
 │ Vouchers)  │ │            │  │              │ │             │ │             │
 └──────┬─────┘ └──────┬─────┘  └───────┬──────┘ └──────┬──────┘ └──────┬──────┘
        │              │                │               │               │
        └──────────────┴────────┬───────┴───────────────┴───────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
        ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
        │  MySQL 8  │    │   Redis     │    │ Object Store│
        │ (InnoDB,  │    │ (sessions,  │    │(invoices,   │
        │ primary + │    │ cache,queue)│    │ payslips,   │
        │ replicas) │    │             │    │ documents)  │
        └───────────┘    └──────┬──────┘    └─────────────┘
                                │
                        ┌───────▼────────┐
                        │  Worker Tier   │  bulk jobs, returns,
                        │  (BullMQ)      │  e-invoice/EWB, emails
                        └───────┬────────┘
                                │  outbound integrations
             ┌──────────────────┼──────────────────────┐
        ┌────▼────┐        ┌─────▼─────┐          ┌──────▼──────┐
        │ GSP/ASP │        │ Bank feed │          │ Email/SMS/  │
        │(e-inv,  │        │(recon,    │          │ WhatsApp    │
        │ EWB,    │        │ statements│          │ (notify)    │
        │ GSTR)   │        │)          │          │             │
        └─────────┘        └───────────┘          └─────────────┘
```

### 8.2 Architectural Choices
- **Modular monolith first, service-ready.** MVP ships as a **modular monolith** in Node.js/TypeScript with clean module boundaries (Accounting, Compliance, JobWork/Inventory, Payroll, Platform-Admin, IAM). Boundaries are drawn so modules can later be extracted into independent services without rewrites. This balances speed of delivery with future scalability.
- **BFF/API Gateway** handles authN, request-id propagation, rate-limiting, and routes to modules.
- **Async worker tier** (BullMQ on Redis) for bulk actions, return generation, e-invoice/EWB calls, notifications, and scheduled jobs (compliance calendar, ageing).
- **Event/outbox pattern** for reliable side effects (e.g., posting to GL, emitting audit events) using a transactional outbox table in MySQL to avoid dual-write inconsistencies.
- **Read replicas** for reporting/dashboards; heavy analytical queries offloaded from the primary.
- **Idempotency keys** on all mutating and integration endpoints (critical for e-invoice/challan/payment to prevent duplicates).
- **Config-as-data:** tax rates, TDS/TCS sections, PT slabs, statutory rates are stored in versioned, effective-dated reference tables (not hard-coded), so rate changes are configuration, not deployments.
- **Windows desktop client (Electron).** The desktop app renders the **same shared UI** and calls the **same backend APIs** as the web app (no forked business logic). It adds: a **local device bridge** (a Node side-process talking to biometric machines, printers, scanners, weighbridge over USB/serial/TCP); an **offline cache + sync queue** (local encrypted SQLite/IndexedDB) so vouchers/inward can be captured without connectivity and reconciled on reconnect (idempotency keys prevent duplicates); **auto-update** and a **code-signed installer**; secrets in OS keychain (DPAPI). It is a **client only** — all authorization and posting rules are enforced server-side, so an offline draft becomes a real posting only after server validation.

### 8.3 Environments & DevOps
- Environments: dev → staging → prod, India region.
- CI/CD with automated tests, SAST/DAST/SCA, migrations gated and reversible.
- Observability: structured logs, metrics, tracing (request-id correlation), alerting; DB slow-query monitoring.
- Backups: automated encrypted backups, PITR, tested restores; DR plan with RPO/RTO targets.

---

## 9. Database Design Overview

**Engine:** MySQL 8.x, InnoDB, `utf8mb4`, strict SQL mode, `DECIMAL(19,4)` for money (never floats), UTC timestamps, foreign keys enforced. Every business table carries `company_id` (and where relevant `branch_id`) for tenant scoping, plus `created_by/at`, `updated_by/at`, and soft-delete (`deleted_at`) where appropriate. Financial postings are **append-only** (corrections via reversing entries, not row edits).

### 9.1 Core Domains & Key Tables

**Identity & Access**
- `companies` (tenant), `branches` (with `gstin`, state code), `users`, `user_company_roles` (user × company × branch × role scope), `roles`, `permissions`, `role_permissions`, `sessions` (server-side refresh/session state), `mfa_devices`.

**Accounting**
- `account_groups` (hierarchy), `ledgers` (nature, GST/TDS applicability, party info), `parties` (GSTIN, PAN, MSME), `cost_centers`.
- `vouchers` (type, number, date, status, branch), `voucher_lines` (ledger_id, dr/cr, amount, tax metadata, cost_center), `bill_references` (bill-wise tracking), `numbering_series`.
- `journal_postings` / general ledger entries (append-only), `period_locks`, `financial_years`, `opening_balances`.

**Sales/Purchase/Invoicing & GST**
- `items` (HSN/SAC, UoM, tax defaults), `documents` (invoices/notes: header), `document_lines` (qty, rate, taxable value, gst rate), `tax_lines` (cgst/sgst/igst/cess amounts), `einvoice_records` (irn, signed_qr, ack, status), `eway_bills`, `places_of_supply`.
- `gst_returns` (period, type, status, locked), `gstr1_staging`, `gstr3b_summary`, `gstr2b_import`, `gst2b_reco_lines`.

**TDS/TCS**
- `tds_sections`, `tds_rates` (effective-dated), `tds_deductions` (linked voucher, section, rate, amount, deductee, deposited flag), `tds_challans` (ITNS 281 details), `tds_returns` (24Q/26Q/27Q staging), `lower_deduction_certs`.
- `tcs_categories`, `tcs_rates`, `tcs_collections`, `tcs_challans`, `tcs_returns` (27EQ), `pan_threshold_tracking` (aggregate per PAN/FY).

**Job Work & Inventory**
- `stock_items`, `stock_locations` (incl. job-worker custody), `stock_states` (RM/SFG/FG), `stock_movements`, `stock_valuation`.
- `jobwork_challans` (outward/inward), `jobwork_lines`, `jobwork_reconciliation`, `itc04_staging`.

**Payroll & HR**
- `employees` (encrypted PAN/Aadhaar/bank, UAN, ESIC), `salary_structures`, `salary_components`, `attendance`, `leave_types`, `leave_balances`, `leave_requests`, `payroll_runs`, `payroll_lines`, `payroll_deductions`, `reimbursements`, `payslips`, `statutory_configs` (PF/ESI/PT numbers, rates), `form16_data`.

**Controls & Platform**
- `approval_policies`, `approval_requests`, `approval_steps`, `audit_logs` (hash-chained), `outbox_events`, `background_jobs`, `notifications`, `reference_rates` (versioned tax config).
- **Documents:** `documents` (id, company/branch, financial_year, module, entity_type, entity_id, doc_type, filename, storage_key in object store, mime, size, checksum, version, uploaded_by/at, deleted_at, retention_until, scan_status), `document_versions`, `document_types` (master). Files live in **encrypted object storage** under the tenant document root (`<company>/<branch>/<FY>/<module>/<entity>/…`); the DB holds only metadata + storage keys, never the bytes.

### 9.2 Design Principles
- **Immutability of postings:** ledger entries never updated in place; reversals create linked entries with reason and approval.
- **Effective-dated reference data:** rates/slabs/sections carry `valid_from`/`valid_to` so historical documents recompute correctly.
- **Referential integrity + tenant scope** enforced at DB and data-access layer; composite indexes on `(company_id, branch_id, date)` and `(company_id, party_id)` for common queries.
- **Idempotency table** for integration calls; **outbox** for reliable eventing.
- **Partitioning/archival** strategy for high-volume tables (audit_logs, journal entries) by financial year.

---

## 10. API Design Overview

### 10.1 Conventions
- **RESTful JSON** over HTTPS; resource-oriented paths; versioned (`/api/v1/...`).
- **Auth:** `Authorization: Bearer <access_token>`; refresh-token rotation; step-up header for sensitive actions.
- **Multi-tenant context:** `X-Company-Id` and `X-Branch-Id` headers (validated against the user's granted scope server-side).
- **Idempotency:** `Idempotency-Key` header required on POST that create financial/integration side effects.
- **Standard envelope:** `{ data, meta, errors }`; consistent error codes; field-level validation errors.
- **Pagination:** cursor-based for large lists; filtering & sorting query params.
- **Rate limiting** and **request-id** on every call; every mutating call emits an audit event.
- **RBAC enforced per endpoint**; 403 with reason for denied permission/scope.

### 10.2 Representative Endpoints

**Auth & Users**
- `POST /api/v1/auth/login`, `POST /auth/mfa/verify`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/sessions/revoke-all`
- `GET/POST /users`, `POST /users/{id}/roles`, `GET/POST /roles`, `GET /permissions`

**Accounting**
- `GET/POST /ledgers`, `GET /ledgers/{id}/statement`
- `POST /vouchers`, `GET /vouchers`, `POST /vouchers/{id}/post`, `POST /vouchers/{id}/submit-approval`
- `GET /reports/trial-balance`, `/reports/pnl`, `/reports/balance-sheet`
- `POST /periods/{id}/lock`, `POST /periods/{id}/reopen` (approval-gated)

**Sales/Purchase/GST**
- `POST /invoices`, `POST /invoices/{id}/einvoice`, `POST /invoices/{id}/ewaybill`, `POST /credit-notes`
- `POST /gst/returns/gstr1/generate`, `GET /gst/returns/gstr3b`, `POST /gst/2b/import`, `POST /gst/2b/reconcile`

**TDS/TCS**
- `POST /tds/deductions`, `GET /tds/registers`, `POST /tds/challans`, `POST /tds/returns/{type}/generate`
- `POST /tcs/collections`, `POST /tcs/challans`, `POST /tcs/returns/27eq/generate`

**Job Work & Inventory**
- `POST /jobwork/challans` (inward/outward), `POST /jobwork/{id}/reconcile`, `GET /jobwork/itc04`
- `GET/POST /stock/items`, `POST /stock/movements`, `GET /stock/valuation`

**Payroll**
- `POST /payroll/runs`, `POST /payroll/runs/{id}/calculate`, `POST /payroll/runs/{id}/approve`, `POST /payroll/runs/{id}/post-gl`
- `GET /payroll/payslips/{employeeId}`, `POST /attendance/import`, `POST /leave/requests`, `POST /leave/{id}/approve`
- `GET /payroll/statutory/pf-ecr`, `/esi`, `/pt`, `/24q`

**Bulk & Approvals**
- `POST /bulk/{operation}` → returns `jobId`; `GET /jobs/{jobId}` for progress/result log
- `GET /approvals`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject`

**Documents**
- `POST /documents` (multipart or presigned-upload init) → attach to `{entity_type, entity_id, doc_type}`; returns metadata after malware/type/size checks
- `GET /documents?entity_type=&entity_id=` list; `GET /documents/{id}` metadata; `GET /documents/{id}/download` → **short-lived signed URL** (authorization-checked)
- `POST /documents/{id}/version` (supersede); `DELETE /documents/{id}` (soft-delete, retention-aware); `POST /documents/bulk` (background job)

**Audit**
- `GET /audit-logs` (filter by actor/entity/date), `GET /audit-logs/export`

**Platform Admin (`Ravi Matel`, internal only)**
- `POST /admin/tenants`, `GET /admin/health`, `GET /admin/tenants/{id}/usage` — restricted to internal Super Admin with separate auth realm.

### 10.3 Integration APIs (async, worker-driven)
- GSP/ASP adapters for e-invoice IRN, e-way bill, and GSTR filing (Phase 2), all idempotent with retry/backoff and dead-letter handling.
- Bank statement import (MT940/CSV/API) for reconciliation.
- Webhook framework (Phase 2) for outbound events to third-party systems.

---

## 11. Frontend Architecture and Shared UI Library Plan

### 11.1 Next.js App
- **Next.js (App Router, TypeScript).** Server Components for data-heavy read screens; Client Components for interactive forms/grids.
- **State/data:** React Query (server state, caching, optimistic updates) + lightweight client store (Zustand) for UI state.
- **Routing & layout:** company/branch switcher in the shell; permission-aware navigation (menu items render only for granted permissions; server still enforces).
- **Forms:** React Hook Form + Zod schemas shared with backend validation contracts; keyboard-first UX (focus management, shortcuts, `Enter`/`Ctrl+Enter` flows) for fast data entry.
- **Grids:** high-performance virtualized data grids for vouchers/ledgers/registers with inline edit, column config, and export.
- **Accessibility & responsiveness:** WCAG-AA targets, responsive layouts (desktop-dense for back-office, usable on tablet), dark mode.
- **Performance:** code-splitting per module, RSC streaming, skeleton loaders, and prefetching.
- **PWA-capable** (installable, offline-read for select screens) — progressive.

### 11.2 Shared UI Library (`@fintranact/ui`)
A **versioned, independently published internal package** consumed by both the tenant app and the internal admin (`Ravi Matel`) screens, ensuring visual and behavioral consistency across all surfaces.

- **Contents:** design tokens (color/spacing/typography), primitives (Button, Input, Select, Combobox, DatePicker with FY-aware India date handling, Money/Amount input with `DECIMAL` semantics, GSTIN/PAN validated inputs), composite components (DataGrid, VoucherForm shell, ApprovalBadge, AuditDiffViewer, TaxBreakupTable, StatusChip, FileUpload), layout (AppShell, Sidebar, Topbar, CompanySwitcher), and feedback (Toast, Modal, ConfirmDialog, BulkJobProgress).
- **Foundation:** built on a headless, accessible primitive set (e.g., Radix) + Tailwind design tokens; theming via CSS variables.
- **India-specific components:** GSTIN input (format + checksum validation), PAN input, HSN/SAC picker, place-of-supply/state selector, amount-in-words (Indian numbering: lakh/crore), financial-year selector.
- **Governance:** Storybook for docs/visual testing; semantic versioning; the package is a **single source of truth** so a fix propagates to all apps via version bump.
- **Monorepo:** managed in a workspaces monorepo (pnpm/Turborepo) so the UI library, web app, admin app, and shared TS types/validation live together and share contracts.

---

## 12. Folder/Module Structure (with `Ravi Matel`)

The mandated **`Ravi Matel`** module namespace appears in **both backend and frontend** as the internal platform-admin / back-office module. A slug-safe alias (`ravi-matel`) is used in file/route paths, with `Ravi Matel` as the human-readable module name.

### 12.1 Monorepo Top Level
```
fintranact/
├── apps/
│   ├── web/                     # Next.js tenant app
│   ├── desktop/                 # Windows desktop app (Electron) — reuses @fintranact/ui
│   │   ├── main/                # Electron main process, auto-update, installer
│   │   ├── device-bridge/       # biometric / printer / scanner / weighbridge (USB/serial/TCP)
│   │   └── offline/             # local encrypted cache + sync queue
│   ├── admin/                   # Next.js internal admin (hosts Ravi Matel screens)
│   └── api/                     # Node.js backend (modular monolith)
├── packages/
│   ├── ui/                      # @fintranact/ui shared component library
│   ├── types/                   # shared TS types & DTOs
│   ├── validation/              # shared Zod schemas (used by FE + BE)
│   └── config/                  # eslint/tsconfig/tailwind presets
├── docs/                        # PRD, ADRs, runbooks
├── infra/                       # IaC, CI/CD, migrations tooling
└── package.json / turbo.json / pnpm-workspace.yaml
```

### 12.2 Backend (`apps/api`) — modular
```
apps/api/src/
├── main.ts                      # bootstrap, DI, middleware
├── common/                      # auth, rbac, audit, errors, tenancy, idempotency
├── modules/
│   ├── iam/                     # users, roles, permissions, sessions, MFA
│   ├── accounting/              # CoA, ledgers, vouchers, GL, periods
│   ├── sales-purchase/          # invoices, orders, notes
│   ├── compliance/
│   │   ├── gst/                 # invoices, GSTR, 2B reco, e-invoice, EWB
│   │   ├── tds/                 # sections, deductions, challans, returns
│   │   └── tcs/                 # collections, challans, 27EQ
│   ├── jobwork/                 # challans, reconciliation, ITC-04
│   ├── inventory/               # items, stock states (RM/SFG/FG), valuation
│   ├── payroll/                 # employees, salary, attendance, leave, statutory
│   ├── reporting/               # financial/compliance/payroll reports
│   ├── documents/               # uploads, document root, versions, signed URLs, scanning
│   ├── approvals/               # maker-checker engine
│   └── ravi-matel/              # ★ Ravi Matel — internal platform admin/back-office
│       ├── ravi-matel.module.ts
│       ├── tenants/             # tenant provisioning & lifecycle
│       ├── ops-dashboard/       # health, usage, support tooling
│       └── system-config/       # reference rates, statutory config admin
├── workers/                     # BullMQ processors (bulk, returns, e-invoice)
└── db/                          # migrations, seeds, reference data
```

### 12.3 Frontend (`apps/web` and `apps/admin`)
```
apps/web/src/app/
├── (auth)/                      # login, mfa
├── (dashboard)/
│   ├── accounting/              # vouchers, ledgers, coa
│   ├── sales-purchase/
│   ├── gst/ tds/ tcs/
│   ├── jobwork/ inventory/
│   ├── payroll/
│   ├── reports/
│   └── settings/                # users, roles, company, branches
└── layout.tsx

apps/admin/src/app/
├── (auth)/
└── ravi-matel/                  # ★ Ravi Matel — internal admin UI
    ├── tenants/
    ├── ops-dashboard/
    └── system-config/
```

> **Naming note:** `Ravi Matel` is the internal platform-administration module (tenant provisioning, ops dashboard, system/statutory-rate configuration). It is deployed in the internal `admin` app and the `api`'s `ravi-matel` module, gated behind a separate internal Super-Admin auth realm — never exposed to tenant users.

---

## 13. Scalability and Performance Considerations

- **Stateless app tier** behind a load balancer → horizontal scale-out; sessions in Redis, not memory.
- **Read replicas** for reporting/dashboards; primary reserved for writes; connection pooling (e.g., ProxySQL) to protect MySQL.
- **Caching:** Redis for reference data (tax rates, masters), computed dashboards, and hot lookups; cache invalidation on writes.
- **Async everything heavy:** bulk actions, return generation, e-invoice/EWB, emails, and report exports run in the **worker tier** so request latency stays low; progress surfaced to UI.
- **Data-entry latency budget:** voucher save p95 < 300 ms; list/grid load p95 < 500 ms on typical volumes.
- **Indexing & query design:** composite indexes on tenant + date + party; avoid N+1 via batched queries; keep financial aggregates via periodic rollups/materialized summaries for fast dashboards.
- **Partitioning/archival:** partition high-volume tables (audit, GL) by financial year; archive closed years to cheaper storage while keeping them queryable.
- **Idempotency & concurrency:** optimistic locking on documents; idempotency keys prevent duplicate invoices/challans/payments under retries.
- **Bulk throughput:** worker concurrency tuned; per-row failure isolation so one bad row doesn't fail the batch.
- **Multi-tenant fairness:** per-tenant rate limits and job quotas to prevent noisy-neighbor impact.
- **Scale target (initial):** thousands of tenants, each with millions of transactions/year; design validated by load tests before GA.

---

## 14. Risk Analysis

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | **Statutory rate/rule changes** (GST/TDS/TCS/PF/ESI/PT) | High | High | Effective-dated, config-as-data reference tables; no hard-coded rates; a "statutory update" release process; compliance-officer review. |
| R2 | **Incorrect tax computation** (place of supply, thresholds, RCM, 194Q/206C interplay) | High | Medium | Rules engine with test suites of Indian tax scenarios; maker-checker on filings; CA-review mode; audit of computations. |
| R3 | **E-invoice / EWB / GSP outages** | Medium | Medium | Async with retries/backoff, dead-letter, offline generation of unsigned invoice + later IRN; provider failover; idempotency to avoid dupes. |
| R4 | **Data breach / PII exposure** (salary, PAN, Aadhaar, bank) | Very High | Low–Med | Field-level encryption, KMS, least-privilege RBAC, masking, pen-tests, monitoring, DPDP-aligned processes, incident response plan. |
| R5 | **Financial data integrity errors** (unbalanced/duplicated postings) | Very High | Low | Double-entry enforcement, append-only ledger, idempotency, outbox pattern, period locks, reconciliation reports. |
| R6 | **Cross-tenant data leakage** | Very High | Low | Mandatory tenant scoping at data layer, automated isolation tests, optional per-tenant keys. |
| R7 | **"100% secure" expectation gap** | Medium | Medium | Set expectations: defense-in-depth + continuous verification; no absolute guarantee; SLAs, transparency, and a security roadmap. |
| R8 | **Scope creep toward full ERP** | Medium | High | Firm MVP scope & non-goals; phased roadmap; change control. |
| R9 | **Performance under bulk/peak (filing deadlines)** | High | Medium | Worker tier, autoscaling, load tests around due dates, per-tenant quotas, caching. |
| R10 | **Migration/onboarding friction** (from Tally/Excel) | High | High | Validated bulk-import templates, opening-balance tooling, guided onboarding, reconciliation checks. |
| R11 | **Approval bottlenecks slowing ops** | Medium | Medium | Configurable thresholds, delegation, escalation SLAs, mobile approvals (Phase 2). |
| R12 | **Vendor lock-in / integration fragility** | Medium | Low | Adapter pattern for GSP/bank/notification providers; swappable implementations. |

---

## 15. MVP Scope

**Objective:** a production-usable Indian accounting + core compliance + payroll system with security and approvals — enough for a real SMB to run its books and stay compliant.

**In scope (MVP):**
1. **Foundations:** multi-company + multi-branch/GSTIN, IAM with RBAC (default roles + configurable permissions), MFA for privileged roles, secure sessions, audit logging, encryption of sensitive fields.
2. **Accounting core:** Chart of Accounts, ledgers (**ledger categories, multi-address, blacklist**), all standard voucher types, double-entry, numbering series, bill-wise tracking, period locks, and **Financial Year management** (open/active/closed, carry-forward, controlled reopen).
3. **Sales/Purchase & Invoicing:** GST-compliant invoices with auto CGST/SGST/IGST/Cess by place of supply, credit/debit notes, ITC flags. **E-invoice (IRN/QR) and E-way bill via GSP** for eligible tenants.
4. **GST reporting:** GSTR-1 & GSTR-3B working (return-ready export as JSON/CSV) and **GSTR-2B reconciliation**; HSN summary.
5. **TDS:** section-aware deduction with threshold tracking, TDS payable/receivable ledgers, challan (ITNS 281) tracking, and **26Q/24Q return-ready output**.
6. **TCS:** 206C(1H) collection with threshold tracking, TCS ledgers, challan tracking, **27EQ return-ready output**, 194Q/206C interplay guard.
7. **Job work (core business):** inward → process → outward with the **Cash/Debit memo and charge on the inward entry**, **outward gated by pending inward quantity**, partial dispatch, wastage/loss reconciliation, **Process Master** & **Rate Master** (contract rates), job-work charges (GST on SAC 9988 + TDS 194C), pending/ageing registers, ITC-04 supporting data.
8. **Masters:** Financial Year, Ledger Categories, Item/Material master, Process Master, Rate Master, numbering series, cost centres, UoM, address types.
8b. **Document management:** upload/attach documents to any record, per-tenant **document root**, auto-filing of generated PDFs (invoice/e-way/payslip/challan), versioning, encrypted storage, RBAC-scoped access via signed URLs, malware scan, and audit.
9. **Payroll (core):** employee master, salary structures, **biometric-machine attendance integration**, leave, monthly run with PF/ESI/PT/TDS deductions, reimbursements, payslips (self-service), GL posting, statutory outputs (PF ECR, ESI, PT, 24Q data).
10. **Controls & signing:** configurable maker-checker approval on payments, credit notes, period reopen, payroll disbursement, permission changes; **user-wise digital signing with a secret PIN** on approve/post/sign actions.
11. **Automation:** keyboard-first fast entry, voucher templates, and one-click bulk actions via worker jobs with result logs.
12. **Reporting & dashboards:** Trial Balance, P&L, Balance Sheet, Day Book, ledger statements, ageing, and **role-based (per-role) dashboards**.
13. **Shared UI library** (`@fintranact/ui`) powering **web + Windows desktop (Electron)** + internal `Ravi Matel` admin, plus **platform admin** (tenant provisioning, ops, system/statutory-rate config). Each delivery phase ships web *and* Windows together (see §16).

**Explicitly deferred from MVP (see §16):** direct GSTN/TRACES e-filing, bank payment initiation, native mobile app, SSO, advanced analytics, multi-currency/forex, fixed-asset depreciation, and any manufacturing/BOM/finished-goods module (out of scope for a job-work business).

---

## 16. Phased Development Plan (Frontend + Backend + Windows App)

Development is **phase-wise**, and **every phase delivers all three surfaces together** — backend APIs, the Next.js web frontend, and the Windows desktop app — built on the **shared UI library** so a feature is written once and appears on web and desktop. Each phase ends with a demoable, testable increment behind the same RBAC and audit spine. Durations are indicative for a small cross-functional team.

**Legend per phase:** **BE** = backend/API/DB · **FE** = web (Next.js) · **WIN** = Windows desktop (Electron) · **Exit** = done-when.

### Phase 0 — Foundation *(≈4–6 wks)*
Establish the spine all features plug into, on all three surfaces at once.
- **BE:** monorepo + modular-monolith scaffolding; MySQL baseline; **IAM** (auth, RBAC, sessions, MFA, **signing PIN**); tenancy scoping; **audit log** (hash-chained); config-as-data; object storage; CI/CD; secrets/KMS.
- **FE:** Next.js app shell; **`@fintranact/ui` v0** (tokens + core components); auth/MFA screens; company/branch switcher; theme (black/red/white); empty **role-based dashboard** frame.
- **WIN:** Electron shell packaging the shared UI; **code-signed installer + auto-update**; secure local storage; **device-bridge & offline-cache scaffolding**; login parity with web.
- **Exit:** a user logs in on **web *and* Windows**, RBAC enforced server-side, every action audit-logged.

### Phase 1 — Accounting Core · Masters · Documents *(≈6–8 wks)*
- **BE:** Chart of Accounts; **ledgers** (categories, multi-address, blacklist); all **voucher types** + double-entry + numbering; **Financial Year** management & period locks; **masters** (Process, Rate, Item/Material, categories); **document upload + document root**.
- **FE:** voucher-type-driven **Quick Entry**; ledger & masters screens; Day Book; **Documents browser**.
- **WIN:** keyboard-first fast entry; **local printing** of vouchers/memos; **offline draft capture + sync**; attach documents from local disk/scanner.
- **Exit:** run full books on web + desktop; blank pass-entry posts; period lock; documents filed.

### Phase 2 — GST · Sales/Purchase · Invoicing · e-Invoice/e-Way *(≈6–8 wks)*
- **BE:** invoices & notes; place-of-supply GST engine; **GSTR-1/3B** working; **GSTR-2B reco**; **GSP** integration (IRN/QR, e-way).
- **FE:** invoice/notes screens; GST returns & 2B-reco UI; HSN summary.
- **WIN:** **local invoice/e-way printing**; GSP calls from desktop; offline invoice queue with later IRN.
- **Exit:** GST-compliant invoicing + return-ready GSTR-1/3B + 2B reconciliation.

### Phase 3 — TDS/TCS · Job Work · Lien · Inventory *(≈6–8 wks)*
- **BE:** section-aware **TDS/TCS** + challans + return-ready 26Q/27Q/27EQ; **job work** inward (Cash/Debit memo + charge) → **outward against pending qty**; job cards; **ITC-04**; **lien/forfeiture** recovery; consumable inventory.
- **FE:** TDS/TCS screens; job-work inward/outward; pending & ageing registers; lien recovery.
- **WIN:** **shop-floor inward/outward** with local **weighbridge/printer**; offline job capture on the plant floor.
- **Exit:** full job-work operations + TDS/TCS compliance working end-to-end.

### Phase 4 — Payroll · Biometric · Form 16 · Statutory *(≈6–8 wks)*
- **BE:** employee/salary structures; **biometric ingestion**; payroll run; PF/ESI/PT/TDS; payslips; **Form 16** (Part A + auto Part B); ECR/challan outputs.
- **FE:** payroll, attendance, leave, payslip, Form 16 screens.
- **WIN:** **biometric device sync agent** (local network/USB); payslip & **Form 16 printing**; offline attendance capture.
- **Exit:** run payroll end-to-end from biometric attendance to payslips + signed Form 16.

### Phase 5 — Reports · Role Dashboards · Approvals · Bulk · Hardening *(≈5–7 wks)*
- **BE:** Trial Balance/P&L/Balance Sheet; **role dashboards**; **approval engine** (maker-checker + thresholds + signing); **bulk jobs**; performance tuning.
- **FE:** role-based dashboards; reports; approvals inbox; bulk actions with result logs.
- **WIN:** offline/local reports & scheduled exports; desktop approvals with PIN sign.
- **Exit:** role-wise dashboards, approvals, bulk automation; **security & performance hardening**; UAT → **GA**.

### Phase 6+ — Post-GA Roadmap *(future)*
| Theme | Items |
|---|---|
| **Direct filing** | GSP/ASP direct GSTR-1/3B filing; TRACES upload for TDS/TCS & Form 16/16A; auto-fetch 26AS/AIS. |
| **Banking** | Bank API + auto reconciliation; **bulk payment initiation** (NEFT/RTGS/UPI, gateway). |
| **Analytics / AI** | BI dashboards; cash-flow forecasting; **OCR bill capture**; reconciliation & compliance copilot. |
| **Mobile & SSO** | Native mobile (approvals, payslips); SSO (SAML/OIDC), SCIM; **macOS/Linux desktop builds**. |
| **Advanced compliance** | GSTR-9/9C; multi-state PT automation; DSC-signed statutory docs; fixed-asset depreciation. |
| **Platform** | Public API + webhooks; CA/consultant multi-client console; WhatsApp/SMS; multi-currency. |

### 16.1 Required Team Skills & Composition (people)
Human skills needed to deliver the phases above (a small team can hold multiple hats; roles map to the tri-surface build). The **Claude Skills** that this team uses to build faster are in **§16.2**.

| Area | Key skills / tools | Used most in |
|---|---|---|
| **Backend engineering** | Node.js + **TypeScript**, REST API design, MySQL schema/indexing/query tuning, Redis, **BullMQ** queues, outbox/idempotency, testing (Jest/Vitest) | All phases |
| **Frontend (web)** | **Next.js**/React (App Router, RSC), TypeScript, React Query, **React Hook Form + Zod**, accessible virtualized **data grids**, design-system consumption | All phases |
| **Windows desktop** | **Electron** (main/renderer/IPC), **code-signing + MSI/NSIS**, **auto-update**, native/serial/USB/TCP device integration, **offline sync** (SQLite), Windows packaging | Ph 0–5 (esp. 3–4) |
| **Shared UI / design system** | Component library engineering, tokens/theming, **Storybook**, semantic versioning, accessibility (WCAG) | Ph 0 onward |
| **Database / DBA** | MySQL 8 administration, migrations, partitioning/archival, backups/PITR, **data migration from Tally/Excel** | Ph 0–1, ongoing |
| **DevOps / Cloud** | CI/CD, containers, **India-region** cloud, IaC, observability (logs/metrics/tracing), DR | All phases |
| **Security / AppSec** | OWASP, **encryption/KMS**, session/authz hardening, **pen-testing**, **DPDP** compliance, threat modeling | Ph 0 & Ph 5 |
| **QA / Test automation** | Unit/integration/e2e (Playwright), **load/performance** testing around filing deadlines, tax-scenario test suites | All phases |
| **Integrations** | **GSP/ASP** (e-invoice/e-way), **biometric device SDKs** (ESSL/ZKTeco/Matrix), printers/weighbridge, bank feeds | Ph 2–4 |
| **Indian accounting domain (SME)** | **Chartered Accountant / consultant** — GST, **TDS/TCS**, payroll (PF/ESI/PT/Form 16), **job-work & lien** law; validates rules & rates | All phases (advisory) |
| **Product & UX** | Product management, UX/UI design, technical writing, onboarding/migration playbooks | All phases |

**Suggested core team:** 1 Tech Lead/Architect, 2 Backend, 2 Frontend (web + shared UI), 1 **Desktop/Electron** engineer, 1 DevOps, 1 QA, 1 Security (shared/part-time), 1 **CA/domain SME** (advisory), 1 PM, 1 UX — scaling per phase.

### 16.2 Claude Skills (Claude Code) used in build & operations
Development is **Claude-Code-driven**: reusable **Claude Skills** encode repeatable tasks so code and documents are generated consistently. Two kinds are used.

**A. Built-in / marketplace skills (used as-is):**
| Skill | Use in Fintranact |
|---|---|
| **`pdf`** | Generate & read PDFs — **Form 16**, tax **invoices** (with IRN/QR), **payslips**, **ITNS-281 challans**, GSTR working, P&L/Balance-Sheet reports, **lien notices**; OCR/extract uploaded bills into the document root. |
| **`xlsx`** | Bulk **import/export** templates (ledgers, items, opening balances, employees), GSTR-1/2B and salary-register spreadsheets, report exports. |
| **`docx`** | Statutory letters & documents — **lien/forfeiture notice**, salary/appointment letters, Form-16 as Word where needed. |
| **`pptx`** | Stakeholder/investor decks, sprint demos, UAT walkthroughs. |
| **`web-artifacts-builder`, `artifact-design`, `dataviz`, `theme-factory`** | Build & iterate the **UI prototypes and dashboards** (the black/red/white mockups, role dashboards, P&L card) before/along with implementation. |
| **`session-start-hook`** | Configure the repo so **Claude Code (web)** sessions can run tests/linters — set up in **Phase 0**. |
| **`init`** | Generate the repo's `CLAUDE.md` codebase guide. |
| **`skill-creator`** | Author & maintain the **custom Fintranact skills** below. |
| **`review` / `security-review` / `simplify`** | Per-PR **code review**, **security review**, and cleanup in every phase. |
| **`run`** | Launch/screenshot the web & desktop app to verify a change actually works. |
| **`claude-api`** | Reference for building the **AI-assist** features (Phase 6 — OCR capture, reconciliation & compliance copilot) on Claude. |

**B. Custom project skills — authored via `skill-creator` and committed to the repo (`.claude/skills/`):**
| Custom skill | What it encodes (so every generation is compliant & consistent) |
|---|---|
| **`fintranact-gst`** | Place-of-supply CGST/SGST/IGST split, RCM, HSN/SAC, e-invoice/e-way rules + test scenarios. |
| **`fintranact-tds-tcs`** | Section/threshold/rate logic (194C/J/I/Q, 206C(1H)), challan & 24Q/26Q/27EQ formats. |
| **`fintranact-voucher`** | Voucher-type field maps & **double-entry posting rules** (the pass-entry model). |
| **`fintranact-jobwork`** | Inward (Cash/Debit memo) → **outward against pending qty**, ITC-04, **lien/forfeiture** recovery. |
| **`fintranact-payroll-form16`** | Payroll computation (PF/ESI/PT/TDS, old/new regime) and **Form 16 Part A/B** generation. |
| **`fintranact-pdf-templates`** | Branded, consistent PDF templates — invoice, payslip, challan, Form 16, notice. |
| **`fintranact-tally-migrate`** | Parse/transform **Tally/Excel** data into the Fintranact schema for onboarding. |
| **`fintranact-test-scenarios`** | Generate the Indian tax/payroll **test-suite** (edge cases, thresholds, regimes). |

These custom skills are versioned with the code, invoked by engineers via Claude Code during each phase, and updated by the CA/domain SME when statutory rules change — keeping generated code, documents, and tests aligned with current law.

---

## 17. Acceptance Criteria

Acceptance is met when the following are demonstrably true (each backed by automated tests where applicable).

**Accounting**
- AC-1: A posted voucher always balances (Σ debits = Σ credits); imbalanced entries are rejected.
- AC-2: Ledger statement running balance matches Trial Balance for the period; drill-down opens the source voucher.
- AC-3: A locked period rejects new/edited postings unless a formally approved reopen occurs (audited).

**GST**
- AC-4: For an intra-state sale, CGST+SGST are applied; for inter-state, IGST — automatically from place of supply; changing the buyer state flips the tax correctly.
- AC-5: For an e-invoice-eligible tenant, saving a qualifying invoice yields a valid IRN + signed QR embedded in the PDF; cancellation within window updates status.
- AC-6: GSTR-1 export is GSTN-schema-valid; GSTR-3B liability equals the books; GSTR-2B reconciliation correctly buckets matched/mismatch/missing lines.

**TDS/TCS**
- AC-7: TDS is auto-computed at the correct section/rate, applies higher rate when PAN is absent, and respects single/annual thresholds; a challan links deducted entries and marks them deposited.
- AC-8: 26Q/24Q (TDS) and 27EQ (TCS) return-ready outputs reconcile to the deduction/collection registers.
- AC-9: The 194Q/206C(1H) interplay guard prevents double application per configured precedence.

**Job Work (core)**
- AC-10: For an inward of 1,000 kg, cumulative **outward can never exceed the pending quantity**; a partial 600 kg dispatch leaves pending = 400 kg (less recorded loss), and once pending = 0 the job card closes; ITC-04 reflects the movements.
- AC-10a: The **Inward entry** carries the **memo type** — *Debit* posts the process charge to the customer ledger + GST (+194C where deducted); *Cash* raises a receipt on delivery — and applies the **Rate Master** rate (customer contract rate overriding standard). Outward does not re-bill.
- AC-10b: Selecting a **Process** from the Process Master carries its SAC and default UoM into the inward entry and rate lookup.
- AC-10f (**lien/forfeiture**): When a customer is overdue and holds material in our custody, an approved + PIN-signed **forfeiture** moves the material to Recovered-Goods stock and reduces the receivable; a subsequent **sale** books revenue + GST and applies net proceeds to the outstanding, leaving a surplus refundable or a shortfall receivable — all fully audited.
- AC-10g (**profit**): Gross Profit = operating income − direct/process cost, and Net Profit = Gross Profit + indirect income − indirect expenses − finance cost − tax, computed live from posted entries; customer-custody material and GST/TDS/TCS are excluded from the P&L; GP%/NP% reconcile to the figures and drill to source vouchers.

**Masters & Ledgers**
- AC-10c: A ledger can hold **multiple addresses**; choosing a delivery address with a different state flips place-of-supply (CGST+SGST ↔ IGST) on the document.
- AC-10d: A **blacklisted** party is blocked (hard) or warned + approval-gated (soft) per policy; removing the blacklist is approval-gated and audited.
- AC-10e: **Financial-year** close carries forward balances and pending job-work positions; posting into a closed FY is rejected unless an approved reopen occurs.

**Payroll**
- AC-11: A payroll run computes gross/net with PF/ESI/PT/TDS correctly, prorates LOP, posts a balanced salary journal to GL, and publishes payslips; PF ECR and ESI/PT/24Q outputs are generated.
- AC-11a: **Biometric** punch logs ingested from the device map to employees, de-duplicate, and produce first-in/last-out, overtime, and LOP; unmapped punches are queued, not silently dropped.
- AC-11b (**signing**): An approve/post/sign action requires the acting user's **secret signing PIN**; a wrong PIN blocks the action and is logged, and a successful sign stamps signer identity + timestamp on the record.
- AC-11c (**Form 16**): Form 16 auto-generates with Part A (TAN/PAN, quarter-wise TDS + challan refs from 24Q) and a Part B computed from payroll (gross → exemptions → §16 → Chapter VI-A → tax → cess → net TDS) under the chosen regime; bulk generation produces one signed, password-protected PDF per employee, auto-filed to the document root, and the Part-B tax reconciles to the year's salary-TDS deducted.

**Security & Controls**
- AC-12: A user without a permission is denied the action **server-side** (not just hidden in UI); denial is logged.
- AC-13: The maker of a payment cannot be its sole approver; approval history is recorded on the record.
- AC-14: Sensitive fields (bank/PAN/Aadhaar/salary) are stored encrypted and masked in UI/logs per role.
- AC-15: Every critical action produces a tamper-evident audit-log entry with actor, before/after, IP, and timestamp; the hash chain verifies.
- AC-16: Sessions expire on idle/absolute timeout; "revoke all sessions" immediately invalidates tokens; step-up re-auth is enforced on sensitive actions.

**Documents**
- AC-DOC-1: A document uploaded against a record is stored **encrypted** in the tenant document root, is retrievable only via a **short-lived signed URL after an authorization check** (not a public URL), and every upload/view/download/delete is audit-logged; a user without access to the parent record cannot list or fetch it.
- AC-DOC-2: Generated PDFs (invoice/e-way/payslip/challan) are **auto-filed** into the document root and linked to their record; re-upload creates a new **version** without losing the prior one; disallowed type/oversize/malware uploads are rejected with a clear reason.

**Multi-tenancy & Automation**
- AC-17: A user scoped to Branch A cannot read/write Branch B data via any endpoint (verified by isolation tests).
- AC-18: A bulk action (e.g., 500 invoices) runs as a background job, reports per-row results, isolates failures, is idempotent on retry, and is fully audited.

**Non-functional**
- AC-19: Voucher save p95 < 300 ms; key list/report loads p95 < 500 ms at target volume.
- AC-20: The shared UI library (`@fintranact/ui`) is consumed by the web app, the **Windows desktop app**, and the `Ravi Matel` admin app from a single versioned package.
- AC-21 (**Windows desktop**): The Windows app installs from a signed installer, auto-updates, logs in with parity to web (same RBAC/audit), prints a voucher/memo locally, ingests a biometric punch via the device bridge, and captures a voucher **offline** that posts (idempotently) on reconnect.

---

## 18. Open Questions

1. **E-invoicing/EWB provider:** Which GSP/ASP will we integrate first, and what are rate limits/SLAs? Do we support multiple providers at launch for failover?
2. **Direct filing timeline:** Is return-ready export sufficient for GA, or do key customers require direct GSTN/TRACES filing in v1?
3. **Inventory depth:** Is lightweight quantity+valuation enough for MVP job work, or do early customers need batch/serial and multi-location now?
4. **Payroll regimes:** Confirm coverage scope for old vs new tax regime, and which states' Professional Tax slabs are required at launch.
5. **Valuation method:** FIFO vs Weighted Average as the default for stock — configurable per company acceptable?
6. **Approval matrix defaults:** What are the default monetary thresholds for single vs dual approval out-of-the-box?
7. **Data residency & hosting:** Confirmed India-region cloud/provider and any customer-specific residency/on-prem needs?
8. **Migration sources:** Primary systems to import from (Tally, Busy, Zoho, Excel)? Do we need a Tally import bridge in MVP?
9. **`Ravi Matel` module scope:** Confirm the exact internal capabilities (tenant provisioning, support impersonation with consent + audit, billing) to include in v1.
10. **Pricing/packaging:** Per-company, per-user, per-GSTIN, or transaction-based? Affects tenancy metering in `Ravi Matel` ops.
11. **CA/consultant console:** Do we need a multi-client CA view in MVP or Phase 2?
12. **Statutory update cadence:** Who owns keeping reference rates current, and what is the SLA for pushing rate changes post-budget?
13. **Number/date localization:** Confirm Indian numbering (lakh/crore), amount-in-words, and financial-year (Apr–Mar) as system-wide defaults.
14. **Notification channels:** Email only in MVP, or SMS/WhatsApp for reminders and approvals?
15. **Biometric devices:** Which make/model(s) are in use (ESSL/ZKTeco/Matrix…), and is integration via device SDK pull, `.dat`/CSV import, or a push API? Any multi-branch device consolidation?
16. **Signing PIN vs DSC:** Is a hashed secret **signing PIN** sufficient for internal approvals, or do statutory documents also need a certificate-based **DSC** in v1?
17. **Job-work rate model:** Confirm charge basis (per kg / per piece / per lot), and whether customer-specific contract rates and minimum charges are needed at launch.
18. **Blacklist policy:** Should blacklisting a party be a **hard block** on transactions or a **soft warning + approval**, and who can override?
19. **Pending-quantity tolerance:** Allowed over/under-return tolerance and how burning/handling loss is treated (auto-write-off vs approval) for job work.
20. **Lien/forfeiture process:** What overdue period and notice procedure trigger forfeiture eligibility, how the recovered material is **valued** (assessed NRV vs outstanding), the GST treatment on the recovery sale, and who may approve — confirm against legal/CA advice before enabling.
21. **Windows desktop:** Confirm **Electron vs Tauri**, the offline scope (which flows must work fully offline vs online-only), and which **hardware** the device bridge must support first (biometric model, printer type, weighbridge protocol).

---

## Appendix A — Stated Assumptions

- **A1.** Base currency is **INR**; financial year is **April–March**; multi-currency is Phase 2.
- **A2.** Tax rates, TDS/TCS sections, and statutory slabs are **configurable, effective-dated reference data**, verified by the tenant's CA — Fintranact ships defaults but is not a legal advisor.
- **A3.** MVP produces **return-ready exports** (GSTN/TRACES-compatible JSON/CSV); **direct filing** is Phase 2 via GSP/ASP.
- **A4.** **E-invoice and e-way bill** require a third-party **GSP/ASP**; availability depends on that integration.
- **A5.** **Bank payment initiation** is out of MVP; the system exports payment batches/files for upload to the bank.
- **A6.** Inventory in MVP is **lightweight** (customer-material custody position + consumable valuation) to support job work; there is **no manufacturing/BOM/finished-goods** module because the reference business is a **job-work / process house only**.
- **A6b.** Job-work **outward is constrained to the pending quantity** of the linked inward; partial dispatches are allowed until pending reaches zero, and burning/handling loss is reconciled explicitly.
- **A6c.** The **Inward entry** carries the **memo type — Cash** (collect on delivery) or **Debit** (bill to ledger) and books the charge; process comes from **Process Master** and rate from **Rate Master** (contract rate overrides standard). **Outward** is a physical dispatch against pending only (no re-billing). A Job Card is a process traveller, not the memo owner.
- **A6d.** **User signing** uses a per-user **secret PIN stored hashed**, separate from the login password; DSC binding is Phase 2.
- **A6e.** **Biometric attendance** is integrated for payroll; exact device integration mode (SDK/import/push) is per deployment (see Open Q15).
- **A6f.** **Documents** are held in **encrypted object storage** under a per-tenant **document root**; the database stores only metadata + storage keys. Files are served exclusively via **authorization-checked, short-lived signed URLs** (never public), and uploads are malware/type/size-scanned.
- **A7.** **`Ravi Matel`** is the **internal platform-admin** module (not a tenant feature), present in both backend (`modules/ravi-matel`) and frontend (`apps/admin/ravi-matel`), behind a separate Super-Admin realm.
- **A8.** "100% secure" is implemented as a **defense-in-depth, security-first mindset**; no absolute security guarantee is claimed — see R7.
- **A9.** Hosting is **India-region**; the platform aligns with **DPDP Act 2023** principles.
- **A10.** The stack is fixed to **Node.js (TypeScript) + MySQL + Next.js + shared UI library**, delivered as a **modular monolith** that is service-extraction-ready. A **Windows desktop app (Electron)** ships from the foundation phase, reusing the same shared UI and backend APIs; it is a client only (authorization stays server-side).
- **A12.** Delivery is **phase-wise**, and **each phase ships backend + web + Windows desktop together** (§16) — not backend-first then a separate UI pass.
- **A11.** Employees, parties, and users are distinct identity concepts; an employee is not automatically a system user.

---

## Appendix B — Glossary of Indian Compliance Terms

| Term | Meaning |
|---|---|
| **GST** | Goods and Services Tax — CGST + SGST (intra-state) or IGST (inter-state), plus Cess where applicable. |
| **GSTIN** | 15-digit GST Identification Number (per state/branch). |
| **Place of Supply** | Determines whether CGST/SGST or IGST applies. |
| **HSN / SAC** | Harmonized System of Nomenclature (goods) / Services Accounting Code. |
| **RCM** | Reverse Charge Mechanism — recipient pays GST via self-invoice. |
| **IRN / E-invoice** | Invoice Reference Number + signed QR from the Invoice Registration Portal. |
| **E-way Bill** | Document for movement of goods above ₹50,000. |
| **GSTR-1 / 3B / 2B / 9** | Outward supplies / summary return / auto-drafted ITC / annual return. |
| **ITC** | Input Tax Credit; §17(5) lists blocked credits. |
| **TDS** | Tax Deducted at Source (194C, 194J, 194I, 194Q, 192, etc.). |
| **TCS** | Tax Collected at Source (206C, incl. 206C(1H) on goods). |
| **ITNS 281** | Challan for depositing TDS/TCS. |
| **24Q / 26Q / 27Q / 27EQ** | TDS returns (salary / non-salary resident / non-resident) / TCS return. |
| **Form 16 / 16A / 27D** | TDS certificates (salary / non-salary) / TCS certificate. |
| **26AS / AIS** | Annual tax statement / Annual Information Statement for reconciliation. |
| **206AB / 206CCA** | Higher TDS/TCS for non-filers of returns. |
| **Section 197** | Lower/nil-deduction certificate. |
| **ITC-04** | Statement of goods sent to / received from job worker. |
| **Rule 45** | Job-work challan requirement for movement of inputs/capital goods. |
| **PF / UAN / ECR** | Provident Fund / Universal Account Number / Electronic Challan-cum-Return. |
| **ESI / ESIC** | Employees' State Insurance / its corporation. |
| **PT** | Professional Tax (state-specific slabs). |
| **Processor's / Bailee's Lien** | Right (Indian Contract Act §170) to retain a customer's goods for unpaid processing charges; after notice, goods may be forfeited and sold to recover dues. |
| **Gross / Net Profit** | Gross = operating income − direct/process cost; Net = gross + other income − indirect expenses − finance cost − tax. |
| **DPDP Act 2023** | Digital Personal Data Protection Act — India's data-privacy law. |
| **FY** | Financial Year, April 1 – March 31. |

---

*End of PRD v1.0 — Fintranact.*
