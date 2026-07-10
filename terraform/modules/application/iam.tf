# AWSLambdaVPCAccessExecutionRole is an AWS-managed policy, not one this module writes with a
# wildcard resource/action grant itself — it covers CloudWatch Logs plus the ec2:*NetworkInterface*
# actions a VPC-attached Lambda needs, which inherently can't be scoped to a specific ENI ARN
# since AWS creates/destroys those ENIs itself as the function scales.
#
# Secrets Manager access, by contrast, IS a policy this module writes, and it's scoped to
# exactly one ARN (var.aurora_master_user_secret_arn) — never a wildcard resource
# (architecture.md §3, requirements.md NFR-005).

resource "aws_iam_role" "lambda" {
  name = "${var.environment}-vetonline-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.environment}-vetonline-api-lambda"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Also AWS-managed, same rationale: X-Ray's write actions aren't scopable to a specific
# resource ARN, and enabling tracing (architecture.md §6) is meaningless without it.
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "lambda_secrets_access" {
  name = "${var.environment}-vetonline-api-secrets-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = var.aurora_master_user_secret_arn
    }]
  })
}

# API Gateway access logging (api_gateway.tf) needs an account-level CloudWatch role
# configured first — a one-time-per-account setting, not per-API. dev and prod are separate
# AWS accounts, so each environment's application module sets this once for its own account.
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.environment}-vetonline-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.environment}-vetonline-api-gateway-cloudwatch"
  }
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}
