output "api_invoke_url" {
  value = module.application.api_invoke_url
}

output "lambda_function_name" {
  value = module.application.lambda_function_name
}

output "migration_lambda_function_name" {
  value = module.migration.lambda_function_name
}
