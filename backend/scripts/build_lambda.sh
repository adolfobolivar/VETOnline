#!/usr/bin/env bash
# Builds a Lambda-compatible deployment package from backend/app + its production
# dependencies, cross-installed for Lambda's arm64/Linux runtime regardless of the host this
# script runs on (e.g. macOS/arm64 locally) — psycopg[binary] ships prebuilt wheels per
# platform, and a wheel built for macOS won't load on Lambda's Amazon Linux runtime.
#
# boto3/botocore are deliberately never a dependency here (not in pyproject.toml, and this
# script doesn't add them) — the Lambda runtime provides them natively (CLAUDE.md).
#
# Usage: build_lambda.sh <build-dir>
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."  # backend/

BUILD_DIR="${1:?Usage: build_lambda.sh <build-dir>}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

uv export --no-dev --no-hashes --format requirements-txt -o "$BUILD_DIR/requirements.txt"

uv pip install \
  --target "$BUILD_DIR" \
  --python-platform aarch64-manylinux_2_28 \
  --python-version 3.12 \
  -r "$BUILD_DIR/requirements.txt"

rm "$BUILD_DIR/requirements.txt"
cp -r app "$BUILD_DIR/app"

find "$BUILD_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
