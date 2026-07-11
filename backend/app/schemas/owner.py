from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pet import PetDetailOut


class OwnerCreate(BaseModel):
    """UC-003 BR-001 (mandatory fields) and BR-002 (10-digit telephone) — both fully
    expressible as native Pydantic constraints, no service-layer rule needed. No `id` field:
    BR-003 says the identifier is server-assigned, so the create schema simply doesn't accept
    one."""

    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    address: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=80)
    telephone: str = Field(pattern=r"^\d{10}$")


class OwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    address: str
    city: str
    telephone: str


class PetSummary(BaseModel):
    """Minimal pet representation for the owners list view (UC-004) — not the full pet detail
    UC-005's owner-detail view returns (see schemas/pet.py's PetDetailOut)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class OwnerListOut(BaseModel):
    """UC-004: each owner in the search-results list includes their pets (just id/name, not
    full detail or visit history — that's UC-005's job)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    address: str
    city: str
    telephone: str
    pets: list[PetSummary]


class OwnerDetailOut(BaseModel):
    """UC-005: owner plus each pet (alphabetical, per the Owner.pets relationship's order_by)
    with its full visit history (chronological). Built explicitly in the service layer, since
    PetDetailOut.pet_type is a resolved name, not a direct attribute passthrough."""

    id: int
    first_name: str
    last_name: str
    address: str
    city: str
    telephone: str
    pets: list[PetDetailOut]
