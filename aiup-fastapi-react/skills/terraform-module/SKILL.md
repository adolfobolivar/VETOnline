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
