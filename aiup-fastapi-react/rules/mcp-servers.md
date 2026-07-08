# MCP Servers

This plugin wires up MCP servers that give the Construction skills authoritative, version-correct knowledge of the
stack, the same way `aiup-vaadin-jooq` wires up Vaadin/jOOQ/JavaDocs MCP servers for its stack. Some are declared in
`.mcp.json` and ready to use; one needs setup you have to do yourself before it's useful.

## Declared in `.mcp.json`

| Server | Type | Used by | Purpose |
|---|---|---|---|
| **Playwright** | stdio (`npx @playwright/mcp@latest`) | `/playwright-test` | Browser automation for authoring/debugging E2E tests. Identical entry to the one `aiup-vaadin-jooq` uses — it's a stack-agnostic official package, not Vaadin-specific. |
| **Terraform** | stdio (Docker: `hashicorp/terraform-mcp-server:1.0.0`) | `/terraform-module` | Current Terraform Registry provider/module documentation. This is **HashiCorp's official server** — AWS Labs previously shipped its own `terraform-mcp-server` but has deprecated it in favor of this one. Requires Docker running locally; no credentials needed for public registry lookups (`TFE_TOKEN` is only required for HCP Terraform/Terraform Enterprise workspace management, which this project doesn't use). |
| **AWS Documentation** | stdio (`uvx awslabs.aws-documentation-mcp-server@latest`) | `/implement-backend`, `/terraform-module` | AWS service documentation (Cognito, Lambda, API Gateway, CloudFront, Aurora) — the gap Context7 doesn't cover, since Context7 is oriented at library/package docs rather than cloud service docs. No credentials needed; requires [`uv`](https://docs.astral.sh/uv/) installed (already a project dependency per `CLAUDE.md`). |

Context7, installed via `aiup-core`, continues to cover FastAPI/SQLAlchemy/Pydantic/React library documentation
generically — nothing above duplicates it.

## Not declared — needs your own setup

| Server | Why it's not in `.mcp.json` | When to add it |
|---|---|---|
| **AWS Postgres MCP Server** (`awslabs.postgres-mcp-server`) | Needs either a live Postgres connection string or RDS Data API access, plus AWS credentials (an `AWS_PROFILE`/`AWS_REGION`, or a cluster/secret ARN). There is no safe, shared way to declare this in a committed `.mcp.json` without baking in an environment-specific secret. | Once a real Aurora instance exists (dev or prod) and you want an assistant to query its actual schema/data directly — useful alongside `/alembic-migration` and `/implement-backend` at that point, but not before. |

To add it yourself once you have a database, follow the [official README](https://github.com/awslabs/mcp/tree/main/src/postgres-mcp-server) — point it at your own connection string or Data API resource ARNs, and keep those credentials in your local MCP config, not in this repo.

## Sources

- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [HashiCorp Terraform MCP Server](https://github.com/hashicorp/terraform-mcp-server)
- [AWS Documentation MCP Server](https://github.com/awslabs/mcp/tree/main/src/aws-documentation-mcp-server)
- [AWS Postgres MCP Server](https://github.com/awslabs/mcp/tree/main/src/postgres-mcp-server)
- [Open Source MCP Servers for AWS (awslabs/mcp)](https://github.com/awslabs/mcp) — the full catalog, in case a
  future skill needs one of the others (e.g. `iam-mcp-server`, `cloudwatch-mcp-server`).
