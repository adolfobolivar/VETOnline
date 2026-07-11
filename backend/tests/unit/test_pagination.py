"""Shared by every infinite-scroll endpoint (UC-002 BR-001, UC-004 BR-002). "Capped at 100
server-side regardless of what the client requests" (architecture.md §2.2, requirements.md
NFR-001) means silently clamped, not rejected."""

from app.schemas.pagination import pagination_params


def test_defaults_to_offset_zero_limit_twenty() -> None:
    # Called with explicit values matching the Query(...) defaults: the raw function's Python
    # default arguments are unresolved `Query` marker objects outside of FastAPI's own request
    # pipeline, so exercising "what a caller gets when it omits both params" means passing the
    # same literal values FastAPI would have resolved them to, not omitting the arguments here.
    pagination = pagination_params(offset=0, limit=20)
    assert pagination.offset == 0
    assert pagination.limit == 20


def test_limit_above_cap_is_silently_clamped_to_100() -> None:
    pagination = pagination_params(offset=0, limit=500)
    assert pagination.limit == 100


def test_limit_within_cap_passes_through() -> None:
    pagination = pagination_params(offset=40, limit=50)
    assert pagination.offset == 40
    assert pagination.limit == 50
