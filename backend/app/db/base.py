from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models — kept separate from alembic/env.py's
    target_metadata for now (that's still None; wiring Base.metadata in there to support
    `alembic revision --autogenerate` is a small follow-up, not done as part of this use case)."""
