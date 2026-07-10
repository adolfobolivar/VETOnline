output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value       = aws_cognito_user_pool.this.arn
  description = "Needed by the application layer's API Gateway Cognito Authorizer (architecture.md §2.2)."
}

output "user_pool_client_id" {
  value       = aws_cognito_user_pool_client.frontend.id
  description = "Needed by the frontend's Amplify configuration."
}
