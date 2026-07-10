# memory_size/timeout aren't in architecture.md §5.1's input-variable matrix (unlike
# lambda_reserved_concurrency, which is) — treated as fixed implementation constants here,
# the same way aurora's engine version and master username are, not promoted to input.yaml.
#
# checkov (CKV_AWS_116 Lambda DLQ, CKV_AWS_173 KMS CMK for env vars, CKV_AWS_272 code signing)
# deliberately not addressed: this Lambda is only invoked synchronously via API Gateway, so a
# DLQ (which captures failed *async* invocations) has nothing to catch here; the KMS CMK is the
# same cost/complexity deferral already made for Aurora; code signing needs a whole AWS Signer
# setup not spec'd anywhere. Consistent with this project's existing prototype-phase
# deferrals (architecture.md §0).

resource "aws_security_group" "lambda" {
  name        = "${var.environment}-vetonline-api-lambda-sg"
  description = "Application Lambda security group - egress only, scoped to what it actually needs."
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-vetonline-api-lambda-sg"
  }
}

resource "aws_security_group_rule" "lambda_egress_https" {
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  security_group_id = aws_security_group.lambda.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTPS out via NAT: Secrets Manager, CloudWatch Logs, X-Ray"
}

resource "aws_security_group_rule" "lambda_egress_postgres" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.lambda.id
  source_security_group_id = var.aurora_security_group_id
  description              = "Postgres to Aurora"
}

# The application layer adding this rule to Aurora's security group — rather than the aurora
# module needing advance knowledge of the Lambda SG — is exactly the pattern the aurora
# module's own comments describe (terraform/modules/aurora/main.tf).
resource "aws_security_group_rule" "aurora_ingress_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.aurora_security_group_id
  source_security_group_id = aws_security_group.lambda.id
  description              = "Allow the application Lambda to reach Aurora Postgres"
}

resource "aws_lambda_function" "app" {
  function_name = "${var.environment}-vetonline-api"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  handler       = "app.main.handler"
  runtime       = "python3.12"
  architectures = ["arm64"]

  role        = aws_iam_role.lambda.arn
  timeout     = 30
  memory_size = 512

  reserved_concurrent_executions = var.lambda_reserved_concurrency

  # Required by architecture.md §6 ("AWS X-Ray must be enabled for API Gateway and Lambda").
  tracing_config {
    mode = "Active"
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_SECRET_ARN = var.aurora_master_user_secret_arn
      DB_HOST       = var.aurora_cluster_endpoint
      DB_NAME       = var.aurora_database_name
      # CORS_ALLOW_ORIGIN intentionally not set here — app/main.py defaults it to "*" until
      # the frontend/CloudFront layer exists; set it here once that domain is real.
    }
  }

  tags = {
    Name = "${var.environment}-vetonline-api"
  }
}
