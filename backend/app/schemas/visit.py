from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class VisitCreate(BaseModel):
    """UC-009 BR-001 (description required) is a native Pydantic constraint. BR-002 (default to
    today if not supplied) is expressed as a default_factory, not a service-layer rule — it
    doesn't depend on any other record, unlike BR-003's owner/pet consistency check (see
    app/services/visit_service.py)."""

    visit_date: date = Field(default_factory=date.today)
    description: str = Field(min_length=1, max_length=500)


class VisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visit_date: date
    description: str
