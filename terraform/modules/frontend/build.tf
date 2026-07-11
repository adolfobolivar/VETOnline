# Packaging: frontend/dist has to exist and be synced to S3 before it's servable, and
# CloudFront's edge caches need invalidating on every new build (its cache would otherwise keep
# serving the previous build's assets under unchanged filenames like index.html). Terraform
# doesn't build the SPA itself; it triggers `npm run build` via null_resource and then syncs
# the output with the AWS CLI (not per-file aws_s3_object resources) so stale files from a
# previous build — Vite's content-hashed asset filenames change every build — are actually
# removed via `--delete`, not left behind as orphaned objects.
#
# Config is injected as real environment variables at build time (not a committed
# frontend/.env.production file) so the built bundle always reflects this environment's actual
# Terraform-provisioned resources, the same source of truth as everywhere else in this
# project's IaC, rather than a hand-maintained duplicate that could drift.

locals {
  frontend_dir = abspath("${path.module}/../../../frontend")
  dist_dir     = "${local.frontend_dir}/dist"

  frontend_source_hash = sha1(join("", concat(
    [for f in fileset(local.frontend_dir, "src/**") : filesha256("${local.frontend_dir}/${f}")],
    [for f in fileset(local.frontend_dir, "public/**") : filesha256("${local.frontend_dir}/${f}")],
    [filesha256("${local.frontend_dir}/index.html")],
    [filesha256("${local.frontend_dir}/package.json")],
    [filesha256("${local.frontend_dir}/package-lock.json")],
    [filesha256("${local.frontend_dir}/vite.config.ts")],
  )))
}

resource "null_resource" "frontend_build" {
  triggers = {
    source_hash = local.frontend_source_hash
    # Also rebuild if the values baked into the bundle change, even with no source edits.
    config_hash = sha1(join("|", [
      var.api_base_url,
      var.aws_region,
      var.cognito_user_pool_id,
      var.cognito_user_pool_client_id,
    ]))
  }

  provisioner "local-exec" {
    working_dir = local.frontend_dir
    command     = "npm ci && npm run build"
    environment = {
      VITE_API_BASE_URL                = var.api_base_url
      VITE_AWS_REGION                  = var.aws_region
      VITE_COGNITO_USER_POOL_ID        = var.cognito_user_pool_id
      VITE_COGNITO_USER_POOL_CLIENT_ID = var.cognito_user_pool_client_id
    }
  }
}

resource "null_resource" "frontend_deploy" {
  triggers = {
    build = null_resource.frontend_build.id
    # Re-sync/invalidate if the bucket or distribution were ever replaced, even with no new build.
    bucket_id       = aws_s3_bucket.frontend.id
    distribution_id = aws_cloudfront_distribution.frontend.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws s3 sync ${local.dist_dir} s3://${aws_s3_bucket.frontend.id}/ --delete
      aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend.id} --paths "/*"
    EOT
  }

  depends_on = [
    null_resource.frontend_build,
    aws_s3_bucket_policy.frontend,
  ]
}
