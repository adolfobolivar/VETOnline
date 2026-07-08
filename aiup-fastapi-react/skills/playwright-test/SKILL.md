---
name: playwright-test
description: >
  Writes Playwright end-to-end functional tests and visual regression baselines for a use case, and updates the
  use-case-to-test traceability matrix. Use when the user asks to "write E2E tests for UC-xxx", "add Playwright
  coverage", "add a visual regression test", or mentions end-to-end testing or screenshot testing for a specific use
  case.
---

# Playwright Test

## Instructions

Write Playwright functional and visual regression tests for use case $ARGUMENTS, following
`docs/guidelines/testing.md` §5. Cover the main success scenario and every alternative/failure flow.

## DO NOT

- Add Firefox or WebKit projects to `playwright.config`. Only the Chromium project is configured — Chrome is the
  only supported browser for this project (requirements.md C-018, testing.md §5) — adding the others is unnecessary
  scope and unnecessary CI time.
- Stop at the main success scenario. Every alternative flow needs its own scenario (testing.md §1, requirements.md
  NFR-007) — e.g. UC-004 needs separate scenarios for the empty-search case (A1), the single-match auto-redirect
  (A2), and the not-found case (A3), not just the multi-result happy path.
- Test authentication against real Clinic User credentials. Use a **dedicated test Cognito user pool**
  (testing.md §5) for UC-011's login/logout/session-expiry scenarios — never real staff credentials.
- Skip the unauthenticated-request test. This is the *only* place UC-011 BR-003 (JWT required, HTTP 401 otherwise)
  and UC-010 A3 (the unauthorized error/redirect flow) can actually be verified — FastAPI-level pytest integration
  tests physically cannot exercise the API Gateway Cognito Authorizer (testing.md §4.4). Don't leave this coverage
  gap assuming "the backend tests probably cover it."
- Add or change a view without adding/updating its visual regression baseline. Reference screenshots are committed
  to the repo and compared pixel-by-pixel on every run (testing.md §5.1) — a new or restyled view with no baseline
  is a coverage gap, not an oversight to fix later.
- Accept a baseline screenshot that doesn't match `docs/guidelines/design-system.md` (wrong tokens, missing
  confirmation banner, ad hoc component). A visual regression baseline that locks in a drifted implementation is
  worse than no baseline — it makes the drift the new "correct" state.

## Workflow

1. Read the target use case from `docs/use-cases/UC-*.md` — main flow, every alternative flow, and the exact
   notification/error text the UI must show.
2. Check `docs/guidelines/testing.md` §7 for this use case's expected E2E coverage.
3. Write a functional test script for the main success scenario, driving the real frontend against a controlled API
   environment.
4. Write a separate scenario per alternative flow (validation errors, not-found, duplicate-name, session expiry,
   etc.) — assert on the specific text/status the use case specifies, not just "an error appeared."
5. If the use case involves authentication or a protected route (most of UC-003 through UC-011), include the
   unauthenticated-request-gets-401-and-redirected-to-login scenario here.
6. Add or update `toHaveScreenshot` visual regression baselines for any view this use case creates or changes; run
   `npx playwright test --update-snapshots` only for the views intentionally changed, never as a blanket pass.
7. Confirm `playwright.config` still only runs the Chromium project.
8. Update the corresponding row in `docs/guidelines/testing.md` §7 to reflect the coverage actually written.
9. Run `npx playwright test` and confirm everything passes.

## Resources

- `docs/guidelines/design-system.md` and `docs/guidelines/design-mockup.html` — what a correct baseline screenshot
  should actually look like.
- `docs/guidelines/testing.md` §5 — E2E strategy, visual regression workflow, browser scope.
- `docs/use-cases/UC-*.md` — the flows, copy, and navigation to verify.
- `docs/use-cases/UC-010-view-application-error.md` and `UC-011-clinic-user-login.md` — the auth/error scenarios
  every protected-route test needs to account for.
- If configured, use the **Playwright MCP server** to help author or debug test scripts interactively — see
  `../../rules/mcp-servers.md`.
