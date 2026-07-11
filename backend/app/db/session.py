import json
import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool


def _database_url_from_secrets_manager() -> str:
    # boto3 is deliberately not a project dependency (CLAUDE.md — the Lambda runtime provides
    # it natively) and is only imported here, lazily, so local dev via DATABASE_URL never
    # needs it installed at all.
    import boto3  # type: ignore[import-not-found]

    secret_arn = os.environ["DB_SECRET_ARN"]
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    dbname = os.environ["DB_NAME"]

    client = boto3.client("secretsmanager")
    secret = json.loads(client.get_secret_value(SecretId=secret_arn)["SecretString"])
    return f"postgresql+psycopg://{secret['username']}:{secret['password']}@{host}:{port}/{dbname}"


def get_database_url() -> str:
    """Shared by this module and migration_handler.py (the migration Lambda) — kept in
    app/db/session.py rather than duplicated, since both need the same local-dev-vs-Secrets-
    Manager logic."""
    # Local development: a full connection string, set directly.
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    # Deployed Lambda: the master password is never a plaintext Terraform-set env var
    # (architecture.md §3) — fetched from Secrets Manager at cold start instead, using the
    # secret ARN the application-layer Terraform module passes in.
    if os.environ.get("DB_SECRET_ARN"):
        return _database_url_from_secrets_manager()

    raise RuntimeError(
        "Neither DATABASE_URL nor DB_SECRET_ARN is set. Use DATABASE_URL for local development "
        "(e.g. postgresql+psycopg://user:password@localhost:5432/vetonline), or "
        "DB_SECRET_ARN + DB_HOST + DB_NAME for the deployed Lambda environment."
    )


# NullPool, not a large in-process pool: each Lambda execution environment holds one
# connection, bounded by reserved concurrency (architecture.md §2.4) — a big client-side pool
# would just recreate the connection-exhaustion problem that setting is meant to avoid.
engine = create_engine(get_database_url(), poolclass=NullPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
