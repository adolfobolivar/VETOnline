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

# A request the Cognito Authorizer itself rejects (missing/invalid/expired JWT) never reaches
# the Lambda, so FastAPI's CORSMiddleware never gets a chance to add CORS headers to that
# response — API Gateway generates it directly. Without this, the browser can't even read a
# real 401 (UnauthorizedException, MISSING_AUTHENTICATION_TOKEN, etc.); fetch() throws a CORS
# error instead, which the frontend's silent-refresh-then-redirect-to-login logic (UC-011 A2)
# can't distinguish from a network failure. DEFAULT_4XX/5XX cover every gateway-level error
# generically, not just this one authorizer case.
resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
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

# CORS preflight: browsers send an unauthenticated OPTIONS request before any "non-simple"
# request (which every call from apiClient.ts is, since it always sets Content-Type:
# application/json and often Authorization) — that request never carries the Cognito JWT by
# design, so it must bypass the authorizer entirely. Without this, "ANY" (above) would swallow
# OPTIONS too and reject every preflight with 401 before it ever reaches FastAPI's
# CORSMiddleware, which is what actually generates the Access-Control-Allow-* response.
# Explicit OPTIONS methods take precedence over a sibling "ANY"/broader method for that verb,
# so this doesn't conflict with proxy_any.
resource "aws_api_gateway_method" "proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "proxy_options_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_options.http_method
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

resource "aws_api_gateway_method" "root_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_rest_api.this.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "root_options_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_rest_api.this.root_resource_id
  http_method             = aws_api_gateway_method.root_options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

# Anonymous-access exceptions to the {proxy+} catch-all's blanket Cognito Authorizer, per
# UC-002 BR-003 and requirements.md NFR-002 (JWT enforcement is scoped to "owners, pets,
# visits" specifically, not every endpoint). API Gateway routes a literal path segment like
# "veterinarians" ahead of the greedy {proxy+} sibling automatically, so these two resources
# take precedence over the catch-all for their exact paths without any conflict.
#
# checkov (CKV_AWS_59, "no open access to back-end resources") fires on both methods below —
# deliberately not addressed: "open access" is the correct, spec-mandated behavior here, not an
# oversight. Every other resource (the {proxy+} catch-all, root) keeps the Cognito Authorizer.
resource "aws_api_gateway_resource" "veterinarians" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "veterinarians"
}

resource "aws_api_gateway_method" "veterinarians_get" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.veterinarians.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "veterinarians_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.veterinarians.id
  http_method             = aws_api_gateway_method.veterinarians_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

# Same CORS-preflight need as proxy_options — even an already-anonymous GET still needs an
# unauthenticated OPTIONS sibling, since apiClient.ts's Content-Type header makes every request
# "non-simple" and preflighted regardless of whether the actual method requires a JWT.
resource "aws_api_gateway_method" "veterinarians_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.veterinarians.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "veterinarians_options_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.veterinarians.id
  http_method             = aws_api_gateway_method.veterinarians_options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

# UC-010 BR-005: the /oups demo route is reachable from the welcome page's "Error" nav link
# (UC-001), which is itself anonymous — so /oups needs to be too.
resource "aws_api_gateway_resource" "oups" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "oups"
}

resource "aws_api_gateway_method" "oups_get" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.oups.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "oups_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.oups.id
  http_method             = aws_api_gateway_method.oups_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

resource "aws_api_gateway_method" "oups_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.oups.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "oups_options_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.oups.id
  http_method             = aws_api_gateway_method.oups_options.http_method
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
      aws_api_gateway_method.proxy_options.id,
      aws_api_gateway_integration.proxy_options_lambda.id,
      aws_api_gateway_method.root_any.id,
      aws_api_gateway_integration.root_lambda.id,
      aws_api_gateway_method.root_options.id,
      aws_api_gateway_integration.root_options_lambda.id,
      aws_api_gateway_resource.veterinarians.id,
      aws_api_gateway_method.veterinarians_get.id,
      aws_api_gateway_integration.veterinarians_lambda.id,
      aws_api_gateway_method.veterinarians_options.id,
      aws_api_gateway_integration.veterinarians_options_lambda.id,
      aws_api_gateway_resource.oups.id,
      aws_api_gateway_method.oups_get.id,
      aws_api_gateway_integration.oups_lambda.id,
      aws_api_gateway_method.oups_options.id,
      aws_api_gateway_integration.oups_options_lambda.id,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
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
