variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource names/tags."
}

variable "api_base_url" {
  type        = string
  description = "Deployed API Gateway invoke URL (application module output), baked into the frontend build as VITE_API_BASE_URL."
}

variable "aws_region" {
  type        = string
  description = "AWS region, baked into the frontend build as VITE_AWS_REGION (Amplify Auth config)."
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Cognito user pool id (cognito module output), baked into the frontend build as VITE_COGNITO_USER_POOL_ID."
}

variable "cognito_user_pool_client_id" {
  type        = string
  description = "Cognito user pool app client id (cognito module output), baked into the frontend build as VITE_COGNITO_USER_POOL_CLIENT_ID."
}
