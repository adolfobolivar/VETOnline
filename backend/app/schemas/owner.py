from pydantic import BaseModel, ConfigDict, Field


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
