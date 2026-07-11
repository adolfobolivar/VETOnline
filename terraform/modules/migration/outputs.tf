output "lambda_function_name" {
  value       = aws_lambda_function.migration.function_name
  description = "Invoke this via `aws lambda invoke` after each deploy to run alembic upgrade head against Aurora."
}
