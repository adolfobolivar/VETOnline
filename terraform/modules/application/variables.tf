variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource names/tags."
}

variable "vpc_id" {
  type        = string
  description = "VPC to deploy the Lambda security group into (network module output)."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs the Lambda's ENIs attach to (network module output)."
}

variable "aurora_security_group_id" {
  type        = string
  description = "Aurora's security group id (aurora module output) — this module adds the Lambda-SG ingress rule to it."
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

variable "cognito_user_pool_arn" {
  type        = string
  description = "Cognito user pool ARN (cognito module output) for the API Gateway Cognito Authorizer."
}

variable "lambda_reserved_concurrency" {
  type        = number
  description = "Max concurrent Lambda executions (requirements.md NFR-012), bounding Aurora connections, from input.yaml."
}

variable "cors_allow_origin" {
  type        = string
  description = "Origin the API's CORS policy allows (architecture.md §2.2) — the deployed frontend's CloudFront domain (frontend module output)."
}
