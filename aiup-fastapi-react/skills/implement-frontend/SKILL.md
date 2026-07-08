---
name: implement-frontend
description: >
  Implements a use case's frontend: a React view, form, or grid wired to the backend API, covering the main flow and
  every alternative/failure flow. Use when the user asks to "implement the frontend for UC-xxx", "build the React
  view", "wire up the form", "add the page for", or mentions React implementation for a specific use case.
---

# Implement Frontend

## Instructions

Implement the frontend for use case $ARGUMENTS as a React view/form/grid, covering the main success scenario and
every alternative flow documented for it. Don't create tests here — use `/playwright-test`. Assume the backend
endpoint already exists (built via `/implement-backend`); if it doesn't, say so rather than stubbing a fake response.

## DO NOT

- Use class components. Functional components and hooks only (CLAUDE.md).
- Let a failed API call crash the view or fall through un-handled. All API errors must surface through the shared
  interceptor/Error Boundary pattern from UC-010 — including the 401/unauthorized variant (UC-010 A3), which should
  attempt the silent token refresh from UC-011 A2 before redirecting to login. Never strand the user on a blank
  screen or an unstyled error.
- Add page-number controls, "next page" buttons, or a fixed page size selector to a list view whose use case
  specifies infinite scroll (UC-002, UC-004 both say explicitly: no user-visible page controls, no fixed page size).
- Paraphrase the notification or validation-error text a use case specifies. `"New Owner Created"`,
  `"There was an error in creating the owner."`, the `"already exists"` field error, etc. are the spec, not
  placeholder copy — use the exact strings.
- Attach the Cognito JWT manually per request. Use the shared Amplify-backed API client (architecture.md §2.1) so
  every request gets the token consistently and 401 handling is centralized in one place, not duplicated per view.
- Assume any browser other than the latest Chrome needs to work. Cross-browser compatibility is explicitly out of
  scope (requirements.md C-018) — don't add polyfills or vendor-prefix workarounds for browsers this project doesn't
  support.

## Workflow

1. Read the target use case from `docs/use-cases/UC-*.md` — main flow, every alternative flow (validation errors,
   not-found, duplicates), the exact notification/error text, and which other use cases it navigates to/from.
2. Check existing frontend code for component structure, styling approach, and data-fetching patterns already in
   use — follow them.
3. Build the view/form/grid for the main success scenario, wired to the backend endpoint.
4. Implement each alternative flow explicitly: field-level validation errors, the specified notification banner
   text, redirects (e.g. UC-004 A2's single-match auto-navigation to UC-005), and any "not found" states.
5. For list views backed by an infinite-scroll use case, implement scroll-triggered fetching against the backend's
   `offset`/`limit` contract (architecture.md §2.2) with no visible page controls.
6. Confirm errors and 401s route through the shared interceptor/Error Boundary rather than a local, view-specific
   catch block.
7. Start the dev server and exercise the feature in a real Chrome browser — main flow and every alternative flow —
   before considering the use case done, per this repo's own testing discipline (CLAUDE.md).

## Resources

- `docs/use-cases/UC-*.md` — the actual behavior, copy, and navigation to implement.
- `docs/use-cases/UC-010-view-application-error.md` and `UC-011-clinic-user-login.md` — the shared error-handling
  and auth patterns every other view depends on.
- `CLAUDE.md` §"React / Frontend" — component and error-handling conventions.
- Context7 (installed via `aiup-core`) for React library documentation.
- If configured, the Playwright MCP server can help explore the rendered app while building the view (see
  `../../rules/mcp-servers.md`).
