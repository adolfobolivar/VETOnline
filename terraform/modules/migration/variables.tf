variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource names/tags."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs the Lambda's ENIs attach to (network module output)."
}

variable "lambda_security_group_id" {
  type        = string
  description = "The application layer's Lambda security group id (application module output). Reused as-is: this Lambda needs exactly the same connectivity (Aurora 5432, HTTPS 443 for Secrets Manager) that security group already grants, so no new security group or Aurora ingress rule is created here."
}

variable "aurora_cluster_endpoint" {
  type        = string
  description = "Aurora writer endpoint (aurora module output), passed to the Lambda as DB_HOST."
}

variable "aurora_database_name" {
  type        = string
  description = "Aurora database name (aurora module output), passed to the Lambda as DB_NAME."
}

variable "aurora_master_user_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for the RDS-managed master credentials (aurora module output). The Lambda's IAM role is scoped to exactly this ARN."
}
