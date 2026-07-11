output "api_invoke_url" {
  value = module.application.api_invoke_url
}

output "lambda_function_name" {
  value = module.application.lambda_function_name
}

output "migration_lambda_function_name" {
  value = module.migration.lambda_function_name
}

output "cognito_user_pool_id" {
  value       = module.cognito.user_pool_id
  description = "For the frontend's Amplify Auth configuration (architecture.md §2.1)."
}

output "cognito_user_pool_client_id" {
  value       = module.cognito.user_pool_client_id
  description = "For the frontend's Amplify Auth configuration (architecture.md §2.1)."
}

output "aws_region" {
  value = local.input.aws_region
}
