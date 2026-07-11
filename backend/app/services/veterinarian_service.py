from sqlalchemy.orm import Session, selectinload

from app.db.models.veterinarian import Veterinarian
from app.schemas.pagination import Pagination
from app.schemas.veterinarian import VeterinarianOut


def list_veterinarians(db: Session, pagination: Pagination) -> list[VeterinarianOut]:
    vets = (
        db.query(Veterinarian)
        .options(selectinload(Veterinarian.specialties))
        .order_by(Veterinarian.last_name, Veterinarian.first_name)
        .offset(pagination.offset)
        .limit(pagination.limit)
        .all()
    )
    return [
        VeterinarianOut(
            id=vet.id,
            first_name=vet.first_name,
            last_name=vet.last_name,
            specialties=[s.name for s in vet.specialties],
        )
        for vet in vets
    ]
