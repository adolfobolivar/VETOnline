# Root module for the `dev` environment. The backend below is a partial S3 config
# (architecture.md §4.1) — bucket/key/region/dynamodb_table come from backend.hcl, not this
# file or input.yaml, because Terraform resolves the backend before evaluating any
# variables/locals. Initialize with:
#   terraform init -backend-config=backend.hcl
# The bucket/table it points to are created by terraform/bootstrap/dev/, applied once by hand
# before this root module's first init — see that module and the terraform-module skill's
# "Bootstrap Prerequisite" section.
#
# Credentials: unlike terraform/bootstrap/dev/ (which has no remote backend and so can read
# secrets.yaml directly via yamldecode), the `backend "s3" {}` block here can't read
# secrets.yaml — same backend-resolves-before-locals constraint as the bucket name. So both
# the backend and this provider rely on the standard AWS credential chain (env vars, shared
# credentials file, IMDS role) instead. Use with-creds.sh to export this environment's
# secrets.yaml as env vars before running any terraform command here, e.g.:
#   ./with-creds.sh terraform init -backend-config=backend.hcl

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}
}

locals {
  input = yamldecode(file("${path.module}/input.yaml"))
  # Separate from input.yaml (and gitignored) because it holds real staff PII (name + personal
  # email) — see clinic_users.yaml.example for the schema.
  clinic_users = yamldecode(file("${path.module}/clinic_users.yaml")).clinic_users
}

provider "aws" {
  region = local.input.aws_region

  default_tags {
    tags = {
      Environment = local.input.environment
      Project     = "VETOnline"
      Owner       = "team-vetonline"
      ManagedBy   = "Terraform"
    }
  }
}

module "network" {
  source = "../../modules/network"

  environment        = local.input.environment
  vpc_cidr           = local.input.vpc_cidr
  availability_zones = local.input.availability_zones
}

module "aurora" {
  source = "../../modules/aurora"

  environment              = local.input.environment
  vpc_id                   = module.network.vpc_id
  private_subnet_ids       = module.network.private_subnet_ids
  db_min_capacity          = local.input.db_min_capacity
  db_max_capacity          = local.input.db_max_capacity
  db_backup_retention_days = local.input.db_backup_retention_days
}

module "cognito" {
  source = "../../modules/cognito"

  environment  = local.input.environment
  clinic_users = local.clinic_users
}

module "application" {
  source = "../../modules/application"

  environment                   = local.input.environment
  vpc_id                        = module.network.vpc_id
  private_subnet_ids            = module.network.private_subnet_ids
  aurora_security_group_id      = module.aurora.security_group_id
  aurora_cluster_endpoint       = module.aurora.cluster_endpoint
  aurora_database_name          = module.aurora.database_name
  aurora_master_user_secret_arn = module.aurora.master_user_secret_arn
  cognito_user_pool_arn         = module.cognito.user_pool_arn
  lambda_reserved_concurrency   = local.input.lambda_reserved_concurrency
}

module "migration" {
  source = "../../modules/migration"

  environment                   = local.input.environment
  private_subnet_ids            = module.network.private_subnet_ids
  lambda_security_group_id      = module.application.lambda_security_group_id
  aurora_cluster_endpoint       = module.aurora.cluster_endpoint
  aurora_database_name          = module.aurora.database_name
  aurora_master_user_secret_arn = module.aurora.master_user_secret_arn
}
