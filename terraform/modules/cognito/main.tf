# Identity layer (architecture.md §2.5): a Cognito user pool for Clinic User accounts
# (UC-011), a public app client for the frontend's Amplify SDK, and one aws_cognito_user per
# entry in that environment's input.yaml clinic_users list. There is no self-service sign-up
# and no admin UI in this phase — onboarding a new staff member is "add an entry to
# input.yaml, terraform apply."
#
# Temporary passwords are never set here: omitting temporary_password lets Cognito
# auto-generate one and email it directly to the user as part of the invitation message
# (AdminCreateUser's built-in flow), the same "let AWS own the secret" pattern as Aurora's
# manage_master_user_password — Terraform never sees or stores a plaintext password.
# desired_delivery_mediums is explicitly EMAIL: the default is SMS, which would silently fail
# since clinic_users only carries an email address, no phone number.
#
# email_configuration uses Cognito's built-in email sender (COGNITO_DEFAULT, ~50 emails/day,
# no SES setup required) — appropriate for a single clinic's staff roster; move to SES only if
# that volume/sender-identity limit ever becomes a real constraint.
#
# MFA is intentionally OFF: UC-011 doesn't specify a multi-factor requirement, and adding it
# would mean SMS costs and login-flow complexity beyond what's actually specified.

locals {
  is_prod               = var.environment == "prod"
  clinic_users_by_email = { for u in var.clinic_users : u.email => u }
}

resource "aws_cognito_user_pool" "this" {
  name = "${var.environment}-vetonline-clinic-users"

  username_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  mfa_configuration = "OFF"

  deletion_protection = local.is_prod ? "ACTIVE" : "INACTIVE"

  tags = {
    Name = "${var.environment}-vetonline-clinic-users"
  }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.environment}-vetonline-frontend"
  user_pool_id = aws_cognito_user_pool.this.id

  # Public SPA client (architecture.md §2.1, Amplify SDK) — no client secret, since a
  # browser-based client can't keep one confidential.
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user" "clinic_user" {
  for_each     = local.clinic_users_by_email
  user_pool_id = aws_cognito_user_pool.this.id
  username     = each.value.email

  attributes = {
    email          = each.value.email
    email_verified = "true"
    name           = each.value.name
  }

  desired_delivery_mediums = ["EMAIL"]

  lifecycle {
    ignore_changes = [attributes]
  }
}
