from sqlalchemy.orm import Session

from app.db.models.owner import Owner
from app.db.models.pet import Pet
from app.db.models.visit import Visit
from app.schemas.visit import VisitCreate
from app.services.exceptions import NotFoundError


def add_visit(db: Session, owner_id: int, pet_id: int, data: VisitCreate) -> Visit:
    # UC-009 A3: owner must exist.
    if db.get(Owner, owner_id) is None:
        raise NotFoundError(f"owner {owner_id} not found")

    # UC-009 A2 / BR-003: the pet must both exist and belong to this owner — a pet id that
    # exists but belongs to someone else is rejected the same way as one that doesn't exist.
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_id == owner_id).first()
    if pet is None:
        raise NotFoundError(f"pet {pet_id} not found for owner {owner_id}")

    visit = Visit(pet_id=pet_id, visit_date=data.visit_date, description=data.description)
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit
