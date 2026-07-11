"""UC-009 BR-001 (description required) and BR-002 (default to today) are both native Pydantic
constraints. BR-003 (owner/pet consistency) needs the database and is covered in
tests/integration/test_visits_api.py instead."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.visit import VisitCreate


def test_visit_defaults_to_todays_date_when_omitted() -> None:
    """BR-002."""
    visit = VisitCreate.model_validate({"description": "Annual checkup"})
    assert visit.visit_date == date.today()


def test_visit_accepts_explicit_date() -> None:
    visit = VisitCreate(visit_date=date(2024, 3, 1), description="Follow-up")
    assert visit.visit_date == date(2024, 3, 1)


def test_visit_rejects_blank_description() -> None:
    """BR-001."""
    with pytest.raises(ValidationError) as exc_info:
        VisitCreate(visit_date=date.today(), description="")
    assert any(err["loc"] == ("description",) for err in exc_info.value.errors())


def test_visit_requires_description() -> None:
    with pytest.raises(ValidationError) as exc_info:
        VisitCreate.model_validate({})
    assert any(err["loc"] == ("description",) for err in exc_info.value.errors())
