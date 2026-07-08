---
name: pytest-test
description: >
  Writes pytest unit and integration tests for a use case's backend, against an ephemeral Postgres container, and
  updates the use-case-to-test traceability matrix. Use when the user asks to "write tests for UC-xxx", "add pytest
  coverage", "test the backend", or mentions unit tests, integration tests, or pytest for a specific use case.
---

# Pytest Test

## Instructions

Write pytest unit and integration tests for use case $ARGUMENTS, following `docs/guidelines/testing.md`. Cover the
main success scenario and every alternative/failure flow — a use case is not "tested" on the strength of its happy
path alone.

## DO NOT

- Use SQLite for integration tests, in-memory or otherwise. Tests run against an **ephemeral PostgreSQL container**
  (e.g. via `testcontainers-python`) because SQLite's default case-insensitive `LIKE` would let a test pass while
  violating a business rule that depends on Postgres's actual case-sensitive default (UC-004 BR-001), or vice versa
  for the case-insensitive constraints (testing.md §4.2).
- Assert HTTP 401/unauthorized behavior in these tests. The Cognito Authorizer runs at API Gateway, outside the
  FastAPI app that `TestClient`/`httpx` calls directly — these tests physically cannot exercise it, and asserting it
  here would be a false sense of coverage. That belongs to `/playwright-test` against a deployed API (testing.md
  §4.4).
- Stop at the main success scenario. Every alternative flow listed in the use case (validation errors, not-found,
  duplicates, future dates, ownership mismatches) needs at least one corresponding test (testing.md §1,
  requirements.md NFR-007).
- Call real AWS services. Mock them with `moto` or dependency injection if the use case under test touches one
  (testing.md §4.3) — this use case set currently doesn't, but future ones might.
- Leave `docs/guidelines/testing.md` §7 stale. Update this use case's row once its tests exist, so the traceability
  matrix reflects reality rather than aspiration.

## Workflow

1. Read the target use case from `docs/use-cases/UC-*.md` — main flow, every alternative flow, and its business
   rules (`BR-xxx`).
2. Check `docs/guidelines/testing.md` §7 for which test layers (Unit / Integration / E2E) this use case is expected
   to have, and which specific `BR-xxx` items need coverage.
3. Write unit tests for isolated logic: Pydantic schema validation, and service/domain-layer business rules
   (duplicate-name checks, date validation, ownership consistency), using `pytest` with `unittest.mock`/
   `pytest-mock` to isolate from the database.
4. Write integration tests using the FastAPI `TestClient` (backed by `httpx`) against the actual routers, backed by
   the ephemeral Postgres container fixture — verify HTTP status codes and response bodies, not just "it didn't
   crash."
5. Explicitly write a test per alternative flow — e.g. UC-007 needs separate tests for A1 (duplicate name), A2
   (future birth date), and A3 (missing required field), not one test that only happens to hit one of them.
6. Run `uv run pytest` and confirm everything passes, then `uv run mypy app/` and `uv run ruff check app/` — all
   three gate CI (testing.md §2, §6).
7. Update the corresponding row in `docs/guidelines/testing.md` §7 to reflect the coverage actually written.

## Resources

- `docs/guidelines/testing.md` — fixture strategy, what belongs at each test layer, and the traceability matrix.
- `docs/use-cases/UC-*.md` — the flows and business rules to cover.
- If a **live** database (not the test container) needs querying while writing these tests — e.g. inspecting actual
  seeded data — the AWS Postgres MCP server can help once configured with real credentials; see
  `../../rules/mcp-servers.md`. It is not needed for the ephemeral test-container workflow itself.
