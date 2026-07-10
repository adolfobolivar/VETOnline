output "api_invoke_url" {
  value       = aws_api_gateway_stage.this.invoke_url
  description = "Base URL for the deployed REST API."
}

output "lambda_function_name" {
  value = aws_lambda_function.app.function_name
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda.id
}
