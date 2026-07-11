"""UC-007 BR-003 (type required on create) and "name not blank" are native Pydantic
constraints. UC-008 BR-003 (type optional on update) is the one deliberate difference between
PetCreate and PetUpdate. Duplicate-name (BR-001) and future-birth-date (BR-002) checks are NOT
covered here — they need data this schema doesn't have (other pets, today's date) and are
exercised against the real database in tests/integration/test_pets_api.py instead."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.pet import PetCreate, PetUpdate


def test_pet_create_accepts_valid_data() -> None:
    pet = PetCreate(name="Rex", birth_date=date(2020, 1, 1), pet_type_id=1)
    assert pet.name == "Rex"


def test_pet_create_rejects_blank_name() -> None:
    with pytest.raises(ValidationError) as exc_info:
        PetCreate(name="", birth_date=date(2020, 1, 1), pet_type_id=1)
    assert any(err["loc"] == ("name",) for err in exc_info.value.errors())


def test_pet_create_requires_pet_type_id() -> None:
    """BR-003: type must be chosen when the pet is first created."""
    with pytest.raises(ValidationError) as exc_info:
        PetCreate.model_validate({"name": "Rex", "birth_date": "2020-01-01"})
    assert any(err["loc"] == ("pet_type_id",) for err in exc_info.value.errors())


def test_pet_create_requires_birth_date() -> None:
    with pytest.raises(ValidationError) as exc_info:
        PetCreate.model_validate({"name": "Rex", "pet_type_id": 1})
    assert any(err["loc"] == ("birth_date",) for err in exc_info.value.errors())


def test_pet_update_allows_omitted_pet_type_id() -> None:
    """BR-003 (UC-008): type may be left unchanged on update."""
    pet = PetUpdate.model_validate({"name": "Rex", "birth_date": "2020-01-01"})
    assert pet.pet_type_id is None


def test_pet_update_rejects_blank_name() -> None:
    with pytest.raises(ValidationError) as exc_info:
        PetUpdate.model_validate({"name": "", "birth_date": "2020-01-01"})
    assert any(err["loc"] == ("name",) for err in exc_info.value.errors())
