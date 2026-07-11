from sqlalchemy.orm import Session

from app.db.models.pet_type import PetType


def list_pet_types(db: Session) -> list[PetType]:
    """UC-007 step 2: "a drop-down of available pet types" — the full reference list, not
    paginated (unlike veterinarians/owners, this isn't a growing user-entered dataset)."""
    return db.query(PetType).order_by(PetType.name).all()
