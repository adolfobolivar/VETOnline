"""UC-003 BR-001 (mandatory fields) and BR-002 (telephone format) — both natively expressible
as Pydantic constraints, so covered here rather than against a live database (testing.md §3).
The same schema (OwnerCreate) backs UC-006's update form, so these rules apply there too."""

import pytest
from pydantic import ValidationError

from app.schemas.owner import OwnerCreate

VALID = {
    "first_name": "George",
    "last_name": "Franklin",
    "address": "110 W. Liberty St.",
    "city": "Madison",
    "telephone": "6085551023",
}


def test_accepts_valid_owner() -> None:
    owner = OwnerCreate(**VALID)
    assert owner.telephone == "6085551023"


@pytest.mark.parametrize("field", ["first_name", "last_name", "address", "city", "telephone"])
def test_rejects_blank_mandatory_field(field: str) -> None:
    data = {**VALID, field: ""}
    with pytest.raises(ValidationError) as exc_info:
        OwnerCreate(**data)
    assert any(err["loc"] == (field,) for err in exc_info.value.errors())


@pytest.mark.parametrize(
    "telephone",
    ["608555102", "60855510233", "608-555-1023", "608555102a"],
    ids=["too_short", "too_long", "contains_dashes", "contains_letter"],
)
def test_rejects_malformed_telephone(telephone: str) -> None:
    data = {**VALID, "telephone": telephone}
    with pytest.raises(ValidationError) as exc_info:
        OwnerCreate(**data)
    assert any(err["loc"] == ("telephone",) for err in exc_info.value.errors())


def test_create_schema_has_no_id_field() -> None:
    """BR-003: identifier is server-assigned — the create schema must not accept a client id."""
    assert "id" not in OwnerCreate.model_fields
