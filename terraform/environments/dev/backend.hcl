# Partial backend config for the `dev` environment's remote state (architecture.md §4.1).
#
# Why this file exists instead of reading input.yaml like everything else: Terraform resolves
# the `backend` block before it evaluates any variables/locals, so `terraform { backend "s3" {} }`
# cannot pull its bucket/table names from `yamldecode(file("input.yaml"))` — this is Terraform's
# own initialization-order constraint, not a project convention, so it's the one deliberate
# exception to the "no separate var files, only input.yaml" rule (architecture.md §5.2).
#
# Values below must match terraform/bootstrap/dev/input.yaml's state_bucket_name/lock_table_name
# exactly — that module is what actually creates this bucket/table, in the dev AWS account.
#
# Usage once the environment's root module has `terraform { backend "s3" {} }`:
#   terraform init -backend-config=backend.hcl

bucket         = "vetonline-dev-tfstate-20260709"
key            = "dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "vetonline-dev-tfstate-lock"
encrypt        = true
