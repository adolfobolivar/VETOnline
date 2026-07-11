from typing import NamedTuple

from fastapi import Query


class Pagination(NamedTuple):
    offset: int
    limit: int


def pagination_params(offset: int = Query(0, ge=0), limit: int = Query(20, ge=1)) -> Pagination:
    """Shared by every infinite-scroll endpoint (veterinarians, owners). "Capped at 100
    server-side regardless of what the client requests" (architecture.md §2.2, requirements.md
    NFR-001) means silently clamped, not rejected — a client asking for limit=500 still gets a
    response, just bounded to 100, rather than a 422."""
    return Pagination(offset=offset, limit=min(limit, 100))
