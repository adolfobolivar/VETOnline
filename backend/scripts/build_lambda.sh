#!/usr/bin/env bash
# Builds a Lambda-compatible deployment package from backend/ + its production dependencies,
# cross-installed for Lambda's arm64/Linux runtime regardless of the host this script runs on
# (e.g. macOS/arm64 locally) — psycopg[binary] ships prebuilt wheels per platform, and a wheel
# built for macOS won't load on Lambda's Amazon Linux runtime.
#
# boto3/botocore are deliberately never a dependency here (not in pyproject.toml, and this
# script doesn't add them) — the Lambda runtime provides them natively (CLAUDE.md).
#
# Usage: build_lambda.sh <build-dir> [app|migration]
#   app       (default) - the FastAPI application (app/), handler app.main.handler
#   migration - the Alembic migration runner: alembic/, alembic.ini, migration_handler.py, plus
#               only the app/db/session.py slice the migration handler needs (not the rest of
#               app/) — fastapi/pydantic/mangum stay installed as dependencies either way (one
#               dependency list in pyproject.toml, not worth splitting into groups yet) but are
#               never imported at runtime for this mode, handler migration_handler.handler
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."  # backend/

BUILD_DIR="${1:?Usage: build_lambda.sh <build-dir> [app|migration]}"
MODE="${2:-app}"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

uv export --no-dev --no-hashes --format requirements-txt -o "$BUILD_DIR/requirements.txt"

uv pip install \
  --target "$BUILD_DIR" \
  --python-platform aarch64-manylinux_2_28 \
  --python-version 3.12 \
  -r "$BUILD_DIR/requirements.txt"

rm "$BUILD_DIR/requirements.txt"

case "$MODE" in
  app)
    cp -r app "$BUILD_DIR/app"
    ;;
  migration)
    mkdir -p "$BUILD_DIR/app/db"
    touch "$BUILD_DIR/app/__init__.py" "$BUILD_DIR/app/db/__init__.py"
    cp app/db/session.py "$BUILD_DIR/app/db/session.py"
    # Copied as migrations/, not alembic/: uv pip install --target already put the *pip
    # package* alembic at $BUILD_DIR/alembic — copying our migrations directory there too
    # would nest our env.py etc. one level too deep inside the installed library instead of
    # replacing it. migration_handler.py points script_location at "migrations" to match.
    cp -r alembic "$BUILD_DIR/migrations"
    cp alembic.ini "$BUILD_DIR/alembic.ini"
    cp migration_handler.py "$BUILD_DIR/migration_handler.py"
    ;;
  *)
    echo "Unknown mode: $MODE (expected app or migration)" >&2
    exit 1
    ;;
esac

find "$BUILD_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
