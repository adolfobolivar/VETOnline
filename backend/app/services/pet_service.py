from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.owner import Owner
from app.db.models.pet import Pet
from app.schemas.pet import PetCreate, PetUpdate
from app.services.exceptions import DuplicateNameError, FutureBirthDateError, NotFoundError


def add_pet(db: Session, owner_id: int, data: PetCreate) -> Pet:
    owner = db.get(Owner, owner_id)
    if owner is None:
        raise NotFoundError(f"owner {owner_id} not found")

    if data.birth_date > date.today():
        raise FutureBirthDateError(field="birth_date")

    # Case-insensitive per UC-007 BR-001 — matches the migration's functional unique index on
    # pet(owner_id, lower(name)), not a plain equality comparison (architecture.md §2.4).
    duplicate = db.query(Pet).filter(Pet.owner_id == owner_id, func.lower(Pet.name) == data.name.lower()).first()
    if duplicate is not None:
        raise DuplicateNameError(field="name")

    pet = Pet(
        owner_id=owner_id,
        name=data.name,
        birth_date=data.birth_date,
        pet_type_id=data.pet_type_id,
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def update_pet(db: Session, owner_id: int, pet_id: int, data: PetUpdate) -> Pet:
    # A pet belonging to a different owner is treated the same as one that doesn't exist at
    # all — the URL's owner_id is the source of truth for ownership (same shape as UC-009 BR-003).
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_id == owner_id).first()
    if pet is None:
        raise NotFoundError(f"pet {pet_id} not found for owner {owner_id}")

    if data.birth_date > date.today():
        raise FutureBirthDateError(field="birth_date")

    # UC-008 BR-001: unique per owner, case-insensitive, excluding the pet being updated itself
    # (Pet.id != pet_id) — unlike UC-007's create-time check, which has no "self" to exclude.
    duplicate = (
        db.query(Pet)
        .filter(
            Pet.owner_id == owner_id,
            Pet.id != pet_id,
            func.lower(Pet.name) == data.name.lower(),
        )
        .first()
    )
    if duplicate is not None:
        raise DuplicateNameError(field="name")

    pet.name = data.name
    pet.birth_date = data.birth_date
    # BR-003: type may be left unchanged on update — only overwrite if the client sent one.
    if data.pet_type_id is not None:
        pet.pet_type_id = data.pet_type_id

    db.commit()
    db.refresh(pet)
    return pet
