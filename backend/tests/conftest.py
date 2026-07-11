"""Shared fixtures for the integration suite: a single ephemeral Postgres container for the
whole test session (testing.md §4.2 — never SQLite, since UC-004's case-sensitive prefix match
and UC-007/UC-008's case-insensitive duplicate-name check depend on Postgres's actual collation
behavior), migrated once via Alembic, with mutable tables truncated between tests.

`app.db.session` builds its SQLAlchemy engine from `DATABASE_URL` at *import time* (see that
module), so nothing under `app.*` that transitively imports it (routers, `app.main`) may be
imported at test-collection time — only from inside a fixture, after `DATABASE_URL` is set and
migrated. Test modules must go through the `client` fixture below rather than importing
`app.main` themselves.
"""

import os
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.postgres import PostgresContainer

# testcontainers' Ryuk reaper (a helper container that garbage-collects containers if the test
# process crashes) fails to start under Docker Desktop on macOS — it can't mount the proxied
# docker.sock the same way a native Linux Docker daemon would. Not needed for correctness here:
# `with PostgresContainer(...)` (below) already tears the container down on normal exit.
os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Reference/lookup tables (PET_TYPE, SPECIALTY) are seeded once by the Alembic data migration
# and treated as fixed reference data by every test, same as in production — only the
# use-case-owned, mutable tables are reset between tests.
MUTABLE_TABLES = "visit, pet, vet_specialty, veterinarian, owner"


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[PostgresContainer]:
    with PostgresContainer("postgres:16-alpine", driver="psycopg") as container:
        yield container


@pytest.fixture(scope="session")
def database_url(postgres_container: PostgresContainer) -> str:
    return postgres_container.get_connection_url()


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    # Setting DATABASE_URL here, before anything under app.* is imported anywhere in the
    # session, is what makes it safe for later fixtures/tests to import app.main.
    os.environ["DATABASE_URL"] = database_url

    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(alembic_cfg, "head")

    db_engine = create_engine(database_url)
    yield db_engine
    db_engine.dispose()


@pytest.fixture()
def db_session(engine: Engine) -> Iterator[Session]:
    """One session per test, shared between direct arrange-phase inserts and whatever the API
    does through the `client` fixture's dependency override — so data set up before an API call
    is visible to it without a cross-session commit. Mutable tables are truncated afterward so
    each test starts from a clean, empty slate regardless of what the previous test committed."""
    session_factory = sessionmaker(bind=engine, autoflush=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        with engine.begin() as connection:
            connection.execute(text(f"TRUNCATE TABLE {MUTABLE_TABLES} RESTART IDENTITY CASCADE"))


def _make_client(db_session: Session, raise_server_exceptions: bool) -> Iterator[TestClient]:
    """Imported lazily (module-level `import app.main` would run before DATABASE_URL is set) —
    see this file's module docstring."""
    import app.main as app_main
    from app.db.session import get_db

    def override_get_db() -> Iterator[Session]:
        yield db_session

    app_main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(app_main.app, raise_server_exceptions=raise_server_exceptions) as test_client:
        yield test_client
    app_main.app.dependency_overrides.clear()


@pytest.fixture()
def client(db_session: Session) -> Iterator[TestClient]:
    yield from _make_client(db_session, raise_server_exceptions=True)


@pytest.fixture()
def client_allow_server_errors(db_session: Session) -> Iterator[TestClient]:
    """Like `client`, but an unhandled exception in a route becomes an HTTP 500 response
    instead of propagating into the test process — TestClient's default (`client`, above)
    re-raises server exceptions, which is right for catching bugs in every other test, but
    wrong for UC-010 BR-005's `/oups` route, which raises on purpose to prove the deployed app
    (a real ASGI server, which never propagates route exceptions to the caller) sanitizes it
    into a generic response rather than leaking a stack trace (BR-003)."""
    yield from _make_client(db_session, raise_server_exceptions=False)
