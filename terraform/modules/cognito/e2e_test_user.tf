# E2E test account (Playwright, testing.md §5): reuses this environment's Cognito pool rather
# than standing up a second one, per architecture.md §0's prototype-phase trade-offs — a single
# clearly-fake test account, never a real clinic_users entry, kept entirely out of
# clinic_users.yaml (which holds real staff PII).
#
# Unlike the real clinic_user resources in main.tf, this account's password is set directly
# (AdminSetUserPassword, permanent) instead of Cognito's email-invite flow: E2E runs need a
# known, stable credential up front, not an inbox to check. message_action = SUPPRESS skips
# sending that invite email, since there's no real inbox behind this address.

resource "random_password" "e2e_test" {
  length      = 24
  min_lower   = 2
  min_upper   = 2
  min_numeric = 2
  min_special = 2
  # Cognito's password policy allows more, but this set is safe to pass through the
  # local-exec shell command and a .env file below without extra escaping.
  override_special = "!@#%^&*-_=+"
}

resource "aws_cognito_user" "e2e_test" {
  user_pool_id = aws_cognito_user_pool.this.id
  username     = "e2e-test@vetonline.test"

  attributes = {
    email          = "e2e-test@vetonline.test"
    email_verified = "true"
    name           = "E2E Test Account"
  }

  message_action = "SUPPRESS"

  lifecycle {
    ignore_changes = [attributes]
  }
}

resource "null_resource" "e2e_test_password" {
  triggers = {
    user_pool_id = aws_cognito_user_pool.this.id
    username     = aws_cognito_user.e2e_test.username
    password_id  = random_password.e2e_test.id
  }

  # Cognito's own pool id encodes its region as the "<region>_<id>" prefix — reusing it here
  # avoids a separate aws_region module input just for this one CLI call.
  provisioner "local-exec" {
    command = "aws cognito-idp admin-set-user-password --user-pool-id ${aws_cognito_user_pool.this.id} --username ${aws_cognito_user.e2e_test.username} --password '${random_password.e2e_test.result}' --permanent --region ${split("_", aws_cognito_user_pool.this.id)[0]}"
  }

  depends_on = [aws_cognito_user.e2e_test]
}
