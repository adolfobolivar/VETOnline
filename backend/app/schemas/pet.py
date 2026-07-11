from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.visit import VisitOut


class PetCreate(BaseModel):
    """UC-007 BR-003 (type required) and "name not blank" are native Pydantic constraints.
    BR-001 (duplicate name per owner) and BR-002 (birth date not in the future) are NOT here —
    both need data this schema doesn't have access to (other pets, today's date) — see
    app/services/pet_service.py."""

    name: str = Field(min_length=1, max_length=50)
    birth_date: date
    pet_type_id: int


class PetUpdate(BaseModel):
    """UC-008 BR-003: type may be left unchanged on update, unlike PetCreate where it's
    mandatory — pet_type_id is optional here, defaulting to "keep the current value" in the
    service layer when omitted."""

    name: str = Field(min_length=1, max_length=50)
    birth_date: date
    pet_type_id: int | None = None


class PetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    birth_date: date
    owner_id: int
    pet_type_id: int


class PetDetailOut(BaseModel):
    """UC-005: the owner-detail view resolves pet_type to its name (for display) rather than
    the raw id PetOut exposes, and nests each pet's visits (chronological, per the Pet.visits
    relationship's order_by). Built explicitly in the service layer, not via from_attributes —
    pet_type is a transform (PetType object -> its name), not a direct attribute passthrough."""

    id: int
    name: str
    birth_date: date
    pet_type: str
    visits: list[VisitOut]
