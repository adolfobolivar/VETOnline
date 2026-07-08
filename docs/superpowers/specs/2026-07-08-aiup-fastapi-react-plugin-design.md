# Design: `aiup-fastapi-react` — a Construction-phase AIUP plugin for this stack

## Context

VETOnline's spec phase (vision → requirements → entity model → use-case diagram → detailed use cases → architecture
→ testing strategy) is complete and merged (`v0.1.0-spec-foundation`). The next phase in the AI Unified Process is
**Construction**: turning those specs into implemented, tested code.

The AIUP marketplace ships `aiup-vaadin-jooq`, a Construction-phase plugin for Java/Vaadin/jOOQ projects: it reads
`docs/entity_model.md` and `docs/use_cases/UC-*.md` and produces schema migrations, implementation, and tests, with
matching MCP servers wired up for stack-authoritative knowledge. No equivalent exists for this project's stack
(Python/FastAPI/SQLAlchemy/Alembic backend, React frontend, Terraform/AWS infrastructure) — confirmed by checking the
marketplace's package list, which currently contains only `aiup-core` and `aiup-vaadin-jooq`.

This document specifies `aiup-fastapi-react`, a plugin filling that gap, built the same way `aiup-vaadin-jooq` is
(reusable, distributable, not project-local) since this repo's stated mission is to teach the process to others, not
just use it once.

## Goals

- Cover the Construction phase for FastAPI + React + SQLAlchemy/Alembic + Terraform/AWS projects.
- Every skill traces its output back to a use case (`UC-*`) or an entity, the same discipline `aiup-vaadin-jooq`
  enforces.
- Match the reference plugin's shape closely enough that anyone familiar with `aiup-vaadin-jooq` immediately
  understands this one (same `SKILL.md` structure: frontmatter, Instructions, DO NOT, Workflow, Resources).

## Non-goals

- Publishing to the actual `AI-Unified-Process/marketplace` GitHub repo. This plugin lives inside VETOnline
  (`aiup-fastapi-react/` at the repo root) for now; extracting it to its own repo/marketplace submission is a future
  step, not part of this work.
- A Transition-phase (deployment/release) skill set — out of scope, matches the reference plugin's scope (it also
  stops at Construction).
- Actually implementing VETOnline's use cases. This plugin is the tool; using it to build UC-001 through UC-011 is
  separate, later work.

## Skills

Six Construction-phase skills, one more than `aiup-vaadin-jooq`'s five, because this stack has two real differences
from Vaadin/jOOQ: a genuinely separate frontend/backend (so `/implement` splits in two) and substantial from-scratch
cloud infrastructure (so there's a `/terraform-module` skill the Java example doesn't need).

| Skill | Reads | Produces |
| :--- | :--- | :--- |
| `/alembic-migration` | `entity_model.md` | Versioned Alembic migration: schema + reference-data (seed) migrations in the same chain |
| `/implement-backend` | `use-cases/UC-*.md`, `entity_model.md`, `architecture.md` | FastAPI router + Pydantic schema + service/domain layer + SQLAlchemy models, citing `BR-xxx` |
| `/implement-frontend` | `use-cases/UC-*.md` | React view/form/hook covering the main success scenario and every alternative/failure flow |
| `/terraform-module` | `architecture.md` §5 | Terraform module reading `input.yaml`, tagged per §5.3, least-privilege IAM per §3 |
| `/pytest-test` | `use-cases/UC-*.md`, `testing.md` | pytest unit + integration tests against an ephemeral Postgres container; updates the §7 traceability matrix |
| `/playwright-test` | `use-cases/UC-*.md`, `testing.md` §5 | Playwright E2E + visual regression tests |

Construction workflow (mirrors the reference plugin's diagram):

```
/alembic-migration → /implement-backend → /pytest-test
                    ↘ /implement-frontend → /playwright-test
/terraform-module (independent — provisions the infra the above run against)
```

Each `SKILL.md` includes a stack-specific `DO NOT` list (mirroring the reference plugin's jOOQ `fetchInto` warning),
grounded in decisions already made in this repo's own docs — e.g. `/implement-backend` flags "don't put business
rules in Pydantic schemas or routers" (architecture.md §2.3) and "the case-insensitive pet-name constraint needs
`LOWER()`/`citext`, not a plain `UNIQUE`" (architecture.md §2.4).

## MCP servers

Two categories, verified against real, current sources (not guessed):

**Declared directly in `.mcp.json`** (public docs/registry lookups, no credentials required):
- **Playwright** (`npx @playwright/mcp@latest`, stdio) — identical to `aiup-vaadin-jooq`'s entry, for `/playwright-test`.
- **Terraform** (`hashicorp/terraform-mcp-server`, Docker, stdio) — HashiCorp's official server; AWS Labs' own
  Terraform MCP server is deprecated in favor of this one. Provider/module registry docs for `/terraform-module`.
- **AWS Documentation** (`awslabs.aws-documentation-mcp-server` via `uvx`, stdio) — Cognito/Lambda/API
  Gateway/CloudFront service docs, which Context7 (already installed via `aiup-core`) doesn't cover.

**Documented but not declared** (`rules/mcp-servers.md`):
- **AWS Postgres MCP Server** (`awslabs.postgres-mcp-server`) — needs a live connection string or RDS Data API
  access plus AWS credentials. Not useful until an actual Aurora instance exists, and not safe to bake placeholder
  credentials into a shared `.mcp.json`. Documented as "configure this yourself once you have a database," same
  spirit as the reference plugin marking some of its servers optional.

Context7 continues covering FastAPI/SQLAlchemy/Pydantic/React library docs generically — no gap to fill there.

## File layout

```
aiup-fastapi-react/
  README.md                          # mirrors aiup-vaadin-jooq's README structure
  .mcp.json
  rules/
    mcp-servers.md
  skills/
    alembic-migration/SKILL.md
    implement-backend/SKILL.md
    implement-frontend/SKILL.md
    terraform-module/SKILL.md
    pytest-test/SKILL.md
    playwright-test/SKILL.md
```

## Verification

- Every skill's `Reads` column names an artifact that exists in this repo today (`entity_model.md`,
  `use-cases/UC-*.md`, `architecture.md`, `testing.md`) — no skill depends on something not yet written.
- Every `DO NOT` item traces to a specific section of an existing doc, not an invented convention.
- `.mcp.json` entries are exact commands verified from each project's own README/registry, not paraphrased from
  memory.
