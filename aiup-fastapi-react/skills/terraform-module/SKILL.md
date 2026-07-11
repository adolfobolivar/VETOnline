---
name: terraform-module
description: >
  Scaffolds or extends a Terraform module for this project's AWS infrastructure, wired to input.yaml, tagged per the
  cost-allocation strategy, and following least-privilege IAM. Use when the user asks to "create a Terraform
  module", "provision the VPC/Aurora/Lambda/Cognito", "add infrastructure for", or mentions Terraform, IaC, or AWS
  resource provisioning for this project.
---

# Terraform Module

## Instructions

Build or extend a Terraform module for $ARGUMENTS (e.g. "the network layer", "Aurora", "the Cognito user pool",
"the migration Lambda") following `docs/guidelines/architecture.md`. This skill provisions infrastructure — it does
not write application code (`/implement-backend`, `/implement-frontend`) or migrations (`/alembic-migration`).

## DO NOT

- Hardcode IPs, CIDR blocks, availability zones, or capacity values (ACUs, concurrency limits) directly in resource
  blocks. Every such value comes from that environment's `input.yaml` via `local.input.<key>` (architecture.md
  §5.1–§5.2) — never a literal in a `.tf` file.
- Use `.tfvars` files or a `-var-file` flag. This project reads `input.yaml` via `yamldecode(file(...))` into
  `local.input` (architecture.md §5.2) — don't reintroduce the HCL-tfvars pattern.
- Tag resources individually. Tagging is enforced once, at the AWS provider block, via `default_tags`
  (architecture.md §5.3) — a per-resource `tags = {...}` block for the four mandated tags
  (`Environment`/`Project`/`Owner`/`ManagedBy`) is redundant and risks drifting from the standard set.
- Write an IAM policy with a wildcard (`*`) resource or action grant. Every Lambda role gets only the specific
  Aurora/CloudWatch/Secrets Manager actions it needs (architecture.md §3, requirements.md NFR-005).
- Put a database password, API key, or other secret in a Terraform variable, output, or committed file. Secrets are
  created in AWS Secrets Manager and referenced by ARN (architecture.md §3, requirements.md NFR-004) — Terraform
  provisions the secret's existence, not its value in plaintext.
- Skip the remote state backend. Every environment's state lives in the versioned S3 bucket + DynamoDB lock table
  (architecture.md §4.1) — never a local `.tfstate` file.
- Hash only `.id` in an `aws_api_gateway_deployment`'s `triggers` block for a resource whose *content* can change
  in place (e.g. `aws_api_gateway_gateway_response`'s `response_parameters`/`response_templates`, or a method's
  `request_parameters`). A resource's `.id` is stable across in-place updates, so an edit to a gateway response's
  CORS headers (for example) updates the API's config but the trigger hash never changes — no new deployment is
  created, and the live stage silently keeps serving the old behavior. Hash the mutable attribute itself
  (`jsonencode(...response_parameters)`, etc.) alongside or instead of `.id` for anything not immutable on update.

## Bootstrap Prerequisite (Read Before Any Environment Root Module)

The S3 bucket + DynamoDB lock table the DO NOT list above requires do not create themselves — `terraform init` for
an environment's `backend "s3" {}` block fails if they don't already exist, and that block can't read
`state_bucket_name`/`lock_table_name` from `input.yaml` either (Terraform resolves the backend before any
variables/locals). Both are handled by a separate, already-scaffolded bootstrap step, once per AWS account:

- `terraform/bootstrap/<env>/` — a small, local-state-only root module (not wired to any remote backend, since it's
  what creates the backend) that provisions just the state bucket and lock table for that account. `dev` and `prod`
  are separate AWS accounts in this project, so each has its own copy under `bootstrap/dev/` and `bootstrap/prod/`,
  but each reads its credentials from `../../environments/<env>/secrets.yaml` rather than keeping a second copy —
  `bootstrap/<env>/` and `environments/<env>/` always target the same AWS account, so one credentials file per
  account, not one per module. Apply this by hand, once per account, before ever running `terraform init` in the
  corresponding `terraform/environments/<env>/`.
- `terraform/environments/<env>/backend.hcl` — the partial backend config (bucket/key/region/dynamodb_table) an
  environment's root module is initialized with via `terraform init -backend-config=backend.hcl`. Its values must
  match that environment's `bootstrap/<env>/input.yaml` exactly. This `.hcl` file is the one deliberate exception to
  the "no separate var files, only `input.yaml`" rule — it exists only because of Terraform's own backend-resolution
  ordering, not because this project reintroduced `.tfvars`.

Confirm both exist for the target environment before scaffolding that environment's root module; if they don't,
build the bootstrap module first (it is out of scope for $ARGUMENTS unless the user is explicitly asking for it).

## Application Layer Prerequisite (Read Before Building the Lambda/API Gateway Module)

Unlike the network/persistence/identity layers, the application layer (Lambda + API Gateway) depends on an artifact
from an entirely different tool, not just another Terraform module's outputs: `aws_lambda_function` needs an actual
deployment package, which means `backend/app` (from `/implement-backend`) has to exist first. There's nothing to
package otherwise. If it doesn't exist yet, building this layer is either out of scope for now, or needs a
placeholder handler the user has explicitly asked for (see architecture.md's note on this trade-off).

Once `backend/app` exists, the deployment package still can't just be `zip -r` of a locally-installed virtualenv:
compiled dependencies (e.g. `psycopg[binary]`) ship platform-specific wheels, and a wheel built on a developer's Mac
won't load on Lambda's Linux runtime (architecture.md §2.3, "Cross-Platform Packaging"). Cross-install explicitly
(`uv pip install --python-platform aarch64-manylinux_2_28 --python-version 3.12 --target <dir>`, or the equivalent
for the chosen architecture) rather than assuming the build machine's platform matches Lambda's.

## Workflow

1. Read `docs/guidelines/architecture.md` §5 for the full input-variable matrix and the `input.yaml` pattern, plus
   whichever specific section covers the layer being built (§2.1 frontend/CloudFront, §2.2 API Gateway/CORS, §2.4
   persistence/Aurora/connection management, §2.5 Cognito user provisioning, §3 network/security, §4.1 state
   backend).
2. Check existing `terraform/` modules for naming conventions, module boundaries, and provider configuration —
   follow them.
3. Declare the module's inputs as reads from `local.input.<key>`, not hardcoded values or bare `var.x` at the
   environment root.
4. Implement the resources per architecture.md's specific decision for this layer (e.g. Aurora in private subnets
   with no public access, REST API Gateway with a Cognito Authorizer and CORS scoped to the CloudFront domain,
   S3 + CloudFront with custom error responses for SPA deep-linking, Lambda with reserved concurrency capped per
   requirements.md NFR-012).
5. Apply `default_tags` at the provider block; do not add per-resource tag blocks.
6. Scope every IAM role/policy attached to a new resource to only the actions and resource ARNs it actually needs.
7. Run `terraform validate`, `tflint`, and `checkov -d .`, and resolve every finding — this is a CI gate
   (architecture.md §4.2), not optional cleanup.
8. Re-read the module against `input.yaml` and confirm nothing that should be configurable is hardcoded.

## Resources

- `docs/guidelines/architecture.md` — the primary source for every infrastructure decision in this project.
- `docs/guidelines/requirements.md` — constraints (`C-xxx`) and NFRs with the concrete numbers a module must satisfy
  (concurrency caps, backup retention days, tagging).
- If configured, use the **Terraform MCP server** (HashiCorp's official one) for current AWS provider/module
  registry documentation — see `../../rules/mcp-servers.md`.
- If configured, use the **AWS Documentation MCP server** for service-specific configuration details (Cognito user
  pool settings, API Gateway REST API features, CloudFront custom error responses).
