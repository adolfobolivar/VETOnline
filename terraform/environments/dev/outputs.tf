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

output "e2e_test_username" {
  value       = module.cognito.e2e_test_username
  description = "For frontend/.env.test (testing.md §5) — a dedicated, non-staff Cognito account for Playwright E2E runs."
}

output "e2e_test_password" {
  value       = module.cognito.e2e_test_password
  sensitive   = true
  description = "Paired with e2e_test_username. Fetch via: ./with-creds.sh terraform output -raw e2e_test_password"
}

output "frontend_url" {
  value       = "https://${module.frontend.cloudfront_domain_name}"
  description = "The deployed frontend's public URL."
}

output "frontend_s3_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "frontend_cloudfront_distribution_id" {
  value       = module.frontend.cloudfront_distribution_id
  description = "For manual cache invalidation outside of a Terraform apply."
}
