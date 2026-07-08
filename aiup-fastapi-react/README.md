# aiup-fastapi-react

> The FastAPI + React + Terraform/AWS stack plugin for the [**AI Unified Process (AIUP)**](https://unifiedprocess.ai)
> — turns use case specifications into implemented, tested Python/TypeScript code and the AWS infrastructure it runs
> on.

`aiup-fastapi-react` is the **technology-specific** layer of the AI Unified Process for serverless applications built
with [FastAPI](https://fastapi.tiangolo.com) + [SQLAlchemy](https://www.sqlalchemy.org)/[Alembic](https://alembic.sqlalchemy.org)
(backend), [React](https://react.dev) (frontend), and [Terraform](https://www.terraform.io) on AWS. It takes the
artifacts produced by [`aiup-core`](https://github.com/AI-Unified-Process/marketplace/tree/main/aiup-core) — the
entity model and use case specifications — and turns them into database migrations, API implementation, frontend
views, infrastructure, and a full test suite.

## What it does

This plugin covers the **Construction** phase of the AI Unified Process for this stack: schema migrations,
backend/frontend implementation, infrastructure provisioning, and testing — with every artifact traceable back to a
use case (`UC-*`) or an entity.

It is meant to be used **together with `aiup-core`**, which produces the upstream `docs/guidelines/entity_model.md`
and `docs/use-cases/UC-*.md` artifacts these skills read.

## Skills

Each skill is also available as a slash command.

| Phase        | Skill / command       | Description                                                                          |
|--------------|------------------------|--------------------------------------------------------------------------------------|
| Construction | `/alembic-migration`   | Create versioned Alembic migration scripts (schema + reference-data) from the entity model |
| Construction | `/implement-backend`   | Implement a use case's FastAPI router, Pydantic schemas, service layer, and SQLAlchemy models |
| Construction | `/implement-frontend`  | Implement a use case's React view/form/hook, covering every alternative flow          |
| Construction | `/terraform-module`    | Scaffold a Terraform module wired to `input.yaml`, tagged, least-privilege IAM         |
| Construction | `/pytest-test`         | Write pytest unit/integration tests against an ephemeral Postgres container            |
| Construction | `/playwright-test`     | Write Playwright E2E functional and visual regression tests                            |

### Workflow

```
Construction
────────────────────────────────────────────────────────────
/alembic-migration → /implement-backend  → /pytest-test
                    ↘ /implement-frontend → /playwright-test

/terraform-module (independent — provisions the infrastructure the above run against)
```

These skills read the AIUP artifacts under `docs/` (`docs/guidelines/entity_model.md`,
`docs/use-cases/UC-*.md`, `docs/guidelines/architecture.md`, `docs/guidelines/testing.md`) produced by `aiup-core`
and this project's own Elaboration phase, and write code, migrations, infrastructure, and tests into the project.

## MCP servers

The plugin wires up MCP servers that give the skills authoritative, version-correct knowledge of the stack. One
requires setup you do yourself — see [`rules/mcp-servers.md`](rules/mcp-servers.md) for details and sources.

| Server              | Purpose                                                                |
|----------------------|-------------------------------------------------------------------------|
| Playwright           | Browser automation for authoring/debugging end-to-end tests             |
| Terraform (HashiCorp)| Terraform Registry provider/module documentation                        |
| AWS Documentation    | AWS service docs (Cognito, Lambda, API Gateway, CloudFront, Aurora)      |
| AWS Postgres *(manual setup)* | Live schema/data queries against a real Aurora instance, once one exists |

## Installation

This plugin currently lives inside the [VETOnline](https://github.com/adolfobolivar/VETOnline) repository rather
than the AI Unified Process marketplace. To use it in another project, copy the `aiup-fastapi-react/` directory in
alongside your `aiup-core` installation, or point Claude Code at it directly. It is not yet a standalone marketplace
package (see the [design doc](../docs/superpowers/specs/2026-07-08-aiup-fastapi-react-plugin-design.md) for why).

## Prerequisites

- `aiup-core` used already, with an entity model and use case specifications produced under `docs/`
- A Python project with FastAPI, SQLAlchemy, Alembic, and `uv` for dependency management
- A React project for the frontend
- A Terraform project targeting AWS for infrastructure
- Optional: Docker (for the Terraform MCP server) and `uv`/`uvx` (for the AWS Documentation MCP server) — see
  [`rules/mcp-servers.md`](rules/mcp-servers.md)

## License

MIT · part of the [VETOnline](https://github.com/adolfobolivar/VETOnline) repository.
