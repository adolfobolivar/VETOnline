from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PetCreate(BaseModel):
    """UC-007 BR-003 (type required) and "name not blank" are native Pydantic constraints.
    BR-001 (duplicate name per owner) and BR-002 (birth date not in the future) are NOT here —
    both need data this schema doesn't have access to (other pets, today's date) — see
    app/services/pet_service.py."""

    name: str = Field(min_length=1, max_length=50)
    birth_date: date
    pet_type_id: int


class PetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    birth_date: date
    owner_id: int
    pet_type_id: int
