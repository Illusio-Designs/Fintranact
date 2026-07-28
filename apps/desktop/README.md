# @fintranact/desktop

Windows desktop app (Electron). Reuses the shared UI and the **same backend
APIs** as the web app — a client only (authorization stays server-side).

## Run (dev)
```bash
pnpm --filter @fintranact/web dev        # start the web UI on :3000 first
pnpm --filter @fintranact/desktop dev    # launch the Electron shell
```
`FINTRANACT_WEB_URL` overrides the URL the shell loads (default `http://localhost:3000`).

## Roadmap in this app (PRD §16)
- **Ph 1:** local printing of vouchers/memos; offline draft capture + sync.
- **Ph 2:** local invoice/e-way printing; offline invoice queue.
- **Ph 3:** shop-floor inward/outward with weighbridge/printer.
- **Ph 4:** biometric device sync agent; payslip & Form 16 printing.
- Packaging: code-signed **NSIS** installer + **electron-updater** auto-update.
