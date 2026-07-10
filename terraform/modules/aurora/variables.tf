variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource names/tags and to gate prod-only safety settings."
}

variable "vpc_id" {
  type        = string
  description = "VPC to deploy the DB subnet group and security group into (network module output)."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for the DB subnet group (network module output) — Aurora has no public access (architecture.md §2.4/§3)."
}

variable "db_min_capacity" {
  type        = number
  description = "Minimum Aurora Serverless v2 capacity in ACUs (architecture.md §5.1, from input.yaml)."
}

variable "db_max_capacity" {
  type        = number
  description = "Maximum Aurora Serverless v2 capacity in ACUs (architecture.md §5.1, from input.yaml)."
}

variable "db_backup_retention_days" {
  type        = number
  description = "Automated backup / PITR retention window in days (7 dev / 14 prod per requirements.md NFR-013, from input.yaml)."
}
