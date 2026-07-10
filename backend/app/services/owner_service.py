from sqlalchemy.orm import Session

from app.db.models.owner import Owner
from app.schemas.owner import OwnerCreate


def create_owner(db: Session, data: OwnerCreate) -> Owner:
    owner = Owner(**data.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner
