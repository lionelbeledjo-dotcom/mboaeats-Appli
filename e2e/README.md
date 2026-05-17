# E2E tests — admin console

Playwright tests that verify two UX invariants of `/admin`:

1. **Scroll molette** — wheel scrolling works on every `/admin/*` page.
2. **Pas de rebond sidebar** — clicking sidebar items doesn't trigger any
   `scale-*` transform or layout shift.

## Setup

```bash
bunx playwright install chromium
```

## Run

Set admin credentials (a real admin account in your Lovable Cloud DB):

```bash
export E2E_ADMIN_EMAIL="admin@example.com"
export E2E_ADMIN_PASSWORD="********"

bunx playwright test          # headless
bunx playwright test --ui     # interactive debugger
```

By default the runner boots `bun run dev` on port 8080. To target an already-running
server (preview, staging), set `E2E_BASE_URL`:

```bash
E2E_BASE_URL=https://mboaeats.lovable.app bunx playwright test
```

## Files

- `playwright.config.ts` — base config + auto webServer.
- `e2e/globalSetup.ts` — logs into `/admin/login` once, stores session in `e2e/.auth/admin.json`.
- `e2e/admin-scroll.spec.ts` — wheel scroll assertion on every admin route.
- `e2e/admin-sidebar-no-bounce.spec.ts` — static + dynamic check against scale transforms and X-shift.
