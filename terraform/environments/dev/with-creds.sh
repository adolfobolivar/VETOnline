#!/usr/bin/env bash
# Exports this environment's AWS credentials (from secrets.yaml) as standard env vars, then
# runs the given command. Needed because, unlike input.yaml, secrets.yaml can't be wired
# through yamldecode into the `backend "s3" {}` block (Terraform resolves the backend before
# any locals/variables) — the backend and the provider both fall back to the standard AWS
# credential chain (env vars, shared credentials file, IMDS role) instead.
#
# Usage (from anywhere):
#   terraform/environments/dev/with-creds.sh terraform -chdir=terraform/environments/dev init -backend-config=backend.hcl
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

eval "$(python3 - "$script_dir/secrets.yaml" <<'PYEOF'
import sys
import yaml

with open(sys.argv[1]) as f:
    secrets = yaml.safe_load(f)

print(f"export AWS_ACCESS_KEY_ID={secrets['aws_access_key_id']!r}")
print(f"export AWS_SECRET_ACCESS_KEY={secrets['aws_secret_access_key']!r}")
if secrets.get("aws_session_token"):
    print(f"export AWS_SESSION_TOKEN={secrets['aws_session_token']!r}")
PYEOF
)"

exec "$@"
