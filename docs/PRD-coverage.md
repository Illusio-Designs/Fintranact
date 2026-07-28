# Fintranact — PRD Coverage (mock-data build)

> Status snapshot. The **web app is feature-complete per the PRD and runs entirely on mock data**
> (`NEXT_PUBLIC_USE_MOCK` defaults to `true`), so it deploys and demos with **no backend**.
> "Backend-backed" below means a real API endpoint also exists and computes from the DB — the page
> switches to it when `NEXT_PUBLIC_USE_MOCK=false` and the API is hosted.

Legend: **BE** = real backend endpoint + verified math · **mock** = UI-only with realistic mock data.

## Accounting core
| PRD area | Screen | Data |
|---|---|---|
| Double-entry voucher engine | Quick Entry panel (all pages) | **BE** — balanced, row-locked numbering, audited |
| All 8 voucher types (pay/rcpt/contra/journal/sales/purchase/CN/DN) | Quick Entry → post | **BE** — composers, all verified to balance |
| Sales invoice composer (GST split) | Quick Entry · Sales | **BE** |
| Purchase composer (ITC + TDS) | Quick Entry · Purchase | **BE** |
| Ledgers / vouchers / day book lists | `/m/*`, `/reports/day-book` | mock (list) / **BE** (day book) |
| Period locks (close the books) | `/admin/periods` | **BE** — `assertPeriodOpen` guards every post |

## Reports
| PRD area | Screen | Data |
|---|---|---|
| Trial Balance (+ mismatch suspense) | `/reports/trial-balance` | **BE** |
| Day Book | `/reports/day-book` | **BE** |
| Profit & Loss (gross/net) | `/reports/profit-loss` | **BE** |
| Balance Sheet | `/reports/balance-sheet` | **BE** |
| Ageing (receivable/payable buckets) | `/reports/ageing` | mock |

## GST
| GSTR-1 · GSTR-3B · GSTR-2B recon | `/gst/gstr-1`, `/gst/gstr-3b`, `/gst/gstr-2b` | **BE** (1/3B), mock (2B recon) |
| e-Invoice (IRN/QR) · e-Way bills | `/gst/e-invoice`, `/gst/e-way` | mock |

## TDS / TCS
| TDS challans (ITNS-281) · 26Q return | `/tds/challans`, `/tds/returns` | **BE** (summary), mock (detail) |
| TCS collections · 27EQ return | `/tcs/collections`, `/tcs/returns` | mock |

## Job Work (heat-treatment)
| Pending inward/outward (Rule 45) | `/jobwork/pending` | **BE** — pending = recd − dispatched − loss |
| ITC-04 movement | `/jobwork/itc04` | **BE** |
| Lien / material forfeiture | `/jobwork/lien` | mock |

## Payroll & HR
| Payroll run + PF/ESI/PT/TDS | `/payroll/run` | **BE** — statutory math verified |
| Form 16 (Part B + sample PDF) | `/payroll/form16` | **BE** |

## Masters / Documents / Admin
| Process master · Rate master | `/masters/process`, `/masters/rate` | mock (add-form CRUD) |
| Documents repository | `/documents` | mock (upload/list/link) |
| Excel import (older data) | `/import` | **BE** — validate → commit, per-row audit |
| Compliance calendar | `/compliance` | mock |
| Audit trail | `/admin/audit` | mock (BE audit log is hash-chained) |
| Role dashboards | `/dashboard` (role switch) | mock |
| UI Library (design system) | `/ui` | — |

## Not yet done (integration / runtime, not features)
- Phase-0 **runtime bring-up**: MySQL + native `argon2` build + migrate + seed + end-to-end login.
- Wiring the **mock-only** pages to live endpoints (add backend for TCS / e-Invoice / e-Way / lien / masters / documents / compliance when hosted).
- **Windows desktop** (Electron) device bridge + offline sync — scaffold only.
- e-Invoice/e-Way **live IRP/EWB integration**; GSTN/TRACES filing APIs.

**Every PRD module has a working, navigable screen on mock data. Build green; all 32 routes 200.**
