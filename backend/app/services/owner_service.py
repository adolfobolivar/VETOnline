from sqlalchemy.orm import Session, selectinload

from app.db.models.owner import Owner
from app.db.models.pet import Pet
from app.schemas.owner import OwnerCreate, OwnerDetailOut
from app.schemas.pagination import Pagination
from app.schemas.pet import PetDetailOut
from app.schemas.visit import VisitOut
from app.services.exceptions import NotFoundError


def create_owner(db: Session, data: OwnerCreate) -> Owner:
    owner = Owner(**data.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


def _escape_like(value: str) -> str:
    """Postgres's default LIKE is case-sensitive (UC-004 BR-001 — no extra work needed), but a
    last name containing a literal %, _, or \\ would otherwise be misread as a LIKE wildcard."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_owners(db: Session, last_name: str, pagination: Pagination) -> list[Owner]:
    query = db.query(Owner).options(selectinload(Owner.pets))
    # BR-003: empty string is the broadest-possible search (all owners), not a validation error.
    if last_name:
        query = query.filter(Owner.last_name.like(f"{_escape_like(last_name)}%", escape="\\"))
    return query.order_by(Owner.last_name, Owner.first_name).offset(pagination.offset).limit(pagination.limit).all()


def get_owner(db: Session, owner_id: int) -> Owner:
    """Raises NotFoundError if missing. Eager-loads pets (alphabetical, per the relationship's
    order_by) plus each pet's visits (chronological) and type — get_owner_detail's job, but
    other callers needing just an existence check/the plain Owner get it too, harmlessly."""
    owner = (
        db.query(Owner)
        .options(
            selectinload(Owner.pets).selectinload(Pet.visits),
            selectinload(Owner.pets).selectinload(Pet.pet_type),
        )
        .filter(Owner.id == owner_id)
        .first()
    )
    if owner is None:
        raise NotFoundError(f"owner {owner_id} not found")
    return owner


def get_owner_detail(db: Session, owner_id: int) -> OwnerDetailOut:
    """UC-005. Built explicitly, not via from_attributes: PetDetailOut.pet_type is a resolved
    name (pet.pet_type.name), not a direct attribute passthrough."""
    owner = get_owner(db, owner_id)
    return OwnerDetailOut(
        id=owner.id,
        first_name=owner.first_name,
        last_name=owner.last_name,
        address=owner.address,
        city=owner.city,
        telephone=owner.telephone,
        pets=[
            PetDetailOut(
                id=pet.id,
                name=pet.name,
                birth_date=pet.birth_date,
                pet_type=pet.pet_type.name,
                visits=[VisitOut.model_validate(v) for v in pet.visits],
            )
            for pet in owner.pets
        ],
    )


def update_owner(db: Session, owner_id: int, data: OwnerCreate) -> Owner:
    owner = db.get(Owner, owner_id)
    if owner is None:
        raise NotFoundError(f"owner {owner_id} not found")
    for field, value in data.model_dump().items():
        setattr(owner, field, value)
    db.commit()
    db.refresh(owner)
    return owner
