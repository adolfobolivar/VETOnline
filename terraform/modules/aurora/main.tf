# Persistence layer (architecture.md §2.4): Aurora Serverless v2 (PostgreSQL) in private
# subnets only, no public access. The master password is never set or seen by Terraform —
# manage_master_user_password lets RDS create and rotate it in AWS Secrets Manager natively,
# satisfying the "Terraform provisions the secret's existence, not its value in plaintext"
# rule (architecture.md §3, requirements.md NFR-004) without Terraform ever holding a
# plaintext password in state, a variable, or an output.
#
# The security group here starts with zero ingress rules (fully closed) — least privilege by
# default. The application layer adds a scoped ingress rule (Lambda security group -> 5432)
# when it's built, via a separate aws_security_group_rule referencing this module's
# security_group_id output, rather than this module needing advance knowledge of Lambda's SG.
#
# deletion_protection / skip_final_snapshot are gated on environment rather than a new
# input.yaml key: dev can be torn down freely, prod cannot be deleted without a final
# snapshot — this isn't a sizing/topology value like CIDR or ACUs, it's a safety rail tied
# directly to which environment this is.
#
# checkov (CKV_AWS_327 + CKV_AWS_354 KMS CMK encryption for storage/Performance Insights,
# CKV_AWS_118 enhanced monitoring) deliberately not addressed here: a customer-managed KMS key
# adds ~$1/month plus key-rotation/policy upkeep, and enhanced monitoring needs its own IAM
# role — both are real cost/complexity for a low-traffic dev prototype, consistent with this
# project's existing deferred-cost decisions (WAF, RDS Proxy, alerting — architecture.md §0).
# storage_encrypted still uses the default
# AWS-managed key, so data is encrypted at rest either way. Revisit alongside those other
# deferrals once the prototype earns further investment.

locals {
  is_prod = var.environment == "prod"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.environment}-aurora-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-aurora-subnet-group"
  }
}

resource "aws_security_group" "this" {
  name        = "${var.environment}-aurora-sg"
  description = "Aurora cluster security group - no ingress rules by default; the application layer adds one scoped to the Lambda security group."
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-aurora-sg"
  }
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = "${var.environment}-vetonline"
  engine             = "aurora-postgresql"
  database_name      = "vetonline"
  master_username    = "vetonline_admin"

  manage_master_user_password         = true
  iam_database_authentication_enabled = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]

  storage_encrypted               = true
  copy_tags_to_snapshot           = true
  backup_retention_period         = var.db_backup_retention_days
  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection       = local.is_prod
  skip_final_snapshot       = !local.is_prod
  final_snapshot_identifier = local.is_prod ? "${var.environment}-vetonline-final" : null

  serverlessv2_scaling_configuration {
    min_capacity = var.db_min_capacity
    max_capacity = var.db_max_capacity
  }

  tags = {
    Name = "${var.environment}-vetonline-aurora"
  }
}

resource "aws_rds_cluster_instance" "this" {
  cluster_identifier   = aws_rds_cluster.this.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.this.engine
  engine_version       = aws_rds_cluster.this.engine_version
  db_subnet_group_name = aws_db_subnet_group.this.name

  auto_minor_version_upgrade   = true
  performance_insights_enabled = true

  tags = {
    Name = "${var.environment}-vetonline-aurora-instance"
  }
}
