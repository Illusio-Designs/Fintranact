# Fintranact

Secure, role-based **Indian accounting, GST/TDS/TCS, job-work & payroll** platform — built first for **RAVI Metal Treatment**, a job-work / heat-treatment processing house.

- 📄 Product spec: [`docs/PRD.md`](docs/PRD.md)
- 🎨 UI prototype: [`docs/ui-mockup.html`](docs/ui-mockup.html) (open in a browser)
- 🧾 Sample output: [`docs/samples/Form16_sample.pdf`](docs/samples/Form16_sample.pdf)
- 🧠 Build progress log: [`memory.md`](memory.md)

## Monorepo layout
```
apps/
  api/        Node.js + TypeScript backend (Express, modular monolith)
  web/        Next.js web frontend
  desktop/    Windows desktop app (Electron) — reuses shared UI + same APIs
packages/
  ui/         @fintranact/ui shared component library
  types/      @fintranact/types shared TypeScript types/DTOs
  validation/ @fintranact/validation shared zod schemas (FE + BE)
```

## Getting started
Requires Node ≥ 20 and pnpm 9. MySQL 8 for the backend.

```bash
pnpm install                 # install all workspaces
cp apps/api/.env.example apps/api/.env   # configure DB + secrets
pnpm --filter @fintranact/api dev        # backend  → http://localhost:4000
pnpm --filter @fintranact/web dev        # web      → http://localhost:3000
```

See each app's README for details. Development is phase-wise (PRD §16); current
status is tracked in [`memory.md`](memory.md).
