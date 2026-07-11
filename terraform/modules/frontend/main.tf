# Frontend hosting (architecture.md §2.1): the compiled React SPA lives in a private S3 bucket,
# served exclusively through CloudFront via Origin Access Control (OAC) — the bucket itself
# blocks all public access; only this specific CloudFront distribution can read it. Custom
# error responses map both 403 and 404 origin responses to /index.html with HTTP 200, so React
# Router's client-side routes (e.g. /owners/42) resolve on a direct navigation or refresh
# instead of returning S3's raw XML error body.
#
# No custom domain (Route53/ACM) — deliberately deferred alongside API Gateway's CORS scoping
# (architecture.md §2.2, §0): this distribution uses its own *.cloudfront.net domain and
# CloudFront's default certificate. That certificate hard-locks the security policy to TLSv1
# regardless of minimum_protocol_version below — NFR-003 (TLS 1.2+) is not fully met for this
# layer until a custom domain + ACM certificate exists (accepted gap, architecture.md §0).
#
# No WAF (architecture.md §3) and no CloudFront/S3 access logging — both are the same kind of
# prototype-phase deferral as the API layer's (architecture.md §0): no ops team yet to consume
# them, revisit once the prototype earns further investment.
#
# No origin failover (single S3 origin is this SPA's only source of truth — a second origin
# would mean a second, hard-to-keep-in-sync copy of the build) and no geo restriction (this is
# an internal clinic tool reached over the open internet by staff, not a public app that needs
# to exclude regions) — both accepted as-is, not deferrals.

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.environment}-vetonline-frontend"

  tags = {
    Name = "${var.environment}-vetonline-frontend"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.environment}-vetonline-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Least privilege (DO NOT list): scoped to exactly this bucket's objects, and further
# restricted via aws:SourceArn to only this specific distribution — not "any CloudFront
# request," so another distribution in the same account couldn't read this bucket.
data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid       = "AllowCloudFrontReadViaOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.environment}-vetonline-frontend"
  # US/Canada/Europe only — this is a single clinic's internal tool, not a globally-distributed
  # public app; the cheapest price class is the appropriate default for this scope.
  price_class = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SPA deep-link handling (architecture.md §2.1): a route with no matching S3 object is
  # exactly what a client-side-routed path looks like to CloudFront, not a real error.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # AWS ignores this with the default certificate (hard-locked to TLSv1) — kept here as the
    # documented intent, satisfied once a custom domain + ACM certificate replaces it.
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.environment}-vetonline-frontend"
  }
}
