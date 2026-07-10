# Catch-all {proxy+} passthrough rather than one Terraform resource/method per FastAPI route:
# routing is entirely FastAPI's job internally (architecture.md §2.3) — modeling each endpoint
# again in API Gateway would mean keeping two route tables in sync by hand every time a new
# use case adds an endpoint. API Gateway's only job here is auth (Cognito Authorizer) and
# handing everything else to the Lambda.

resource "aws_api_gateway_rest_api" "this" {
  name = "${var.environment}-vetonline-api"

  tags = {
    Name = "${var.environment}-vetonline-api"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Access logging + X-Ray on the stage below satisfy architecture.md §6: "Every incoming
# request must be tagged with a unique Trace/Correlation ID [...] captured at the API Gateway
# level." $context.requestId is that correlation ID.
#
# KMS CMK encryption for this log group (checkov CKV_AWS_158) is the same cost/complexity
# deferral already made for Aurora (lambda.tf) — folded into that same trade-off, not a new one.
resource "aws_cloudwatch_log_group" "api_gateway_access_logs" {
  name              = "/aws/apigateway/${var.environment}-vetonline-api"
  retention_in_days = 365

  tags = {
    Name = "${var.environment}-vetonline-api-access-logs"
  }
}

# Account-level setting (iam.tf) required before any stage's access_log_settings will work.
resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.environment}-vetonline-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.this.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "proxy_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

# {proxy+} only matches paths with at least one segment — the bare "/" needs its own method.
resource "aws_api_gateway_method" "root_any" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_rest_api.this.root_resource_id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_rest_api.this.root_resource_id
  http_method             = aws_api_gateway_method.root_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy_any.id,
      aws_api_gateway_integration.proxy_lambda.id,
      aws_api_gateway_method.root_any.id,
      aws_api_gateway_integration.root_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = var.environment

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_access_logs.arn
    format = jsonencode({
      requestId               = "$context.requestId"
      ip                      = "$context.identity.sourceIp"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  tags = {
    Name = "${var.environment}-vetonline-api-stage"
  }
}
