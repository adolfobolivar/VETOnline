from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.owner import Owner
from app.db.models.pet import Pet
from app.schemas.pet import PetCreate
from app.services.exceptions import DuplicateNameError, FutureBirthDateError, NotFoundError


def add_pet(db: Session, owner_id: int, data: PetCreate) -> Pet:
    owner = db.get(Owner, owner_id)
    if owner is None:
        raise NotFoundError(f"owner {owner_id} not found")

    if data.birth_date > date.today():
        raise FutureBirthDateError(field="birth_date")

    # Case-insensitive per UC-007 BR-001 — matches the migration's functional unique index on
    # pet(owner_id, lower(name)), not a plain equality comparison (architecture.md §2.4).
    duplicate = (
        db.query(Pet)
        .filter(Pet.owner_id == owner_id, func.lower(Pet.name) == data.name.lower())
        .first()
    )
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
