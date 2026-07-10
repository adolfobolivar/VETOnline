output "cluster_endpoint" {
  value       = aws_rds_cluster.this.endpoint
  description = "Writer endpoint for the Aurora cluster."
}

output "cluster_reader_endpoint" {
  value       = aws_rds_cluster.this.reader_endpoint
  description = "Reader endpoint for the Aurora cluster."
}

output "cluster_id" {
  value = aws_rds_cluster.this.cluster_identifier
}

output "database_name" {
  value = aws_rds_cluster.this.database_name
}

output "security_group_id" {
  value       = aws_security_group.this.id
  description = "Attach an ingress rule here (Lambda SG -> 5432) from the application layer module."
}

output "master_user_secret_arn" {
  value       = aws_rds_cluster.this.master_user_secret[0].secret_arn
  description = "Secrets Manager ARN for the RDS-managed master credentials. Grant Lambda's IAM role secretsmanager:GetSecretValue scoped to this exact ARN, nothing broader."
}
