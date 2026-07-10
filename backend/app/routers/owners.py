from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.owner import OwnerCreate, OwnerOut
from app.services import owner_service

router = APIRouter(prefix="/owners", tags=["owners"])


@router.post("", response_model=OwnerOut, status_code=201)
def create_owner(data: OwnerCreate, db: Session = Depends(get_db)) -> OwnerOut:
    owner = owner_service.create_owner(db, data)
    return OwnerOut.model_validate(owner)
