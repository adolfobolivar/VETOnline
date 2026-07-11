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

output "e2e_test_username" {
  value       = aws_cognito_user.e2e_test.username
  description = "Fixed test account for Playwright E2E runs (testing.md §5) — never a real staff member."
}

output "e2e_test_password" {
  value       = random_password.e2e_test.result
  sensitive   = true
  description = "Paired with e2e_test_username. Write into frontend/.env.test (gitignored) via: terraform output -raw e2e_test_password"
}
