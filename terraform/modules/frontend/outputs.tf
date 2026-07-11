output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "The public URL for the deployed frontend, and the value the application module's CORS_ALLOW_ORIGIN should be scoped to (architecture.md §0/§2.2)."
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "For manual cache invalidation (e.g. aws cloudfront create-invalidation) outside of a Terraform apply."
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "The bucket the compiled frontend is synced to."
}
