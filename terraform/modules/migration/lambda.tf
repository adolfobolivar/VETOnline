# No security group or Aurora ingress rule here — var.lambda_security_group_id (the
# application module's Lambda SG) already grants exactly the connectivity this Lambda needs
# (Aurora 5432, HTTPS 443 for Secrets Manager), so it's reused as-is rather than duplicated.
#
# No API Gateway integration: this Lambda is invoked directly via `aws lambda invoke` as a
# deployment-pipeline step (architecture.md §2.4), not through a REST API.
#
# checkov (CKV_AWS_116 DLQ, CKV_AWS_173 env var KMS, CKV_AWS_272 code signing) deliberately not
# addressed — same reasoning as the application module's identical deferrals.

resource "aws_lambda_function" "migration" {
  function_name = "${var.environment}-vetonline-migration"

  filename         = data.archive_file.migration_zip.output_path
  source_code_hash = data.archive_file.migration_zip.output_base64sha256

  handler       = "migration_handler.handler"
  runtime       = "python3.12"
  architectures = ["arm64"]

  role        = aws_iam_role.migration.arn
  timeout     = 60
  memory_size = 256

  # Concurrency capped at 1: unlike the application Lambda's concurrency cap (which protects
  # Aurora's connection pool under traffic, NFR-012), this is a correctness guard — Alembic
  # migrations aren't safe to run concurrently against the same database, and this Lambda
  # should never have more than one in-flight invocation regardless of how it's triggered.
  reserved_concurrent_executions = 1

  tracing_config {
    mode = "Active"
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      DB_SECRET_ARN = var.aurora_master_user_secret_arn
      DB_HOST       = var.aurora_cluster_endpoint
      DB_NAME       = var.aurora_database_name
    }
  }

  tags = {
    Name = "${var.environment}-vetonline-migration"
  }
}
