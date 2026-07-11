# Same rationale as the application module's iam.tf: AWSLambdaVPCAccessExecutionRole and the
# X-Ray policy are AWS-managed (not a wildcard this module writes itself), and Secrets Manager
# access is scoped to exactly one ARN, never a wildcard resource (architecture.md §3,
# requirements.md NFR-005). A separate role from the application Lambda's, even though the
# permissions are nearly identical — this Lambda's job (run migrations) is distinct enough
# from the application Lambda's (serve requests) to warrant its own identity.

resource "aws_iam_role" "migration" {
  name = "${var.environment}-vetonline-migration-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.environment}-vetonline-migration-lambda"
  }
}

resource "aws_iam_role_policy_attachment" "migration_vpc_access" {
  role       = aws_iam_role.migration.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "migration_xray" {
  role       = aws_iam_role.migration.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "migration_secrets_access" {
  name = "${var.environment}-vetonline-migration-secrets-access"
  role = aws_iam_role.migration.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = var.aurora_master_user_secret_arn
    }]
  })
}
