from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.owner import OwnerCreate, OwnerDetailOut, OwnerListOut, OwnerOut
from app.schemas.pagination import Pagination, pagination_params
from app.services import owner_service

router = APIRouter(prefix="/owners", tags=["owners"])


@router.post("", response_model=OwnerOut, status_code=201)
def create_owner(data: OwnerCreate, db: Session = Depends(get_db)) -> OwnerOut:
    owner = owner_service.create_owner(db, data)
    return OwnerOut.model_validate(owner)


@router.get("", response_model=list[OwnerListOut])
def search_owners(
    last_name: str = "",
    pagination: Pagination = Depends(pagination_params),
    db: Session = Depends(get_db),
) -> list[OwnerListOut]:
    owners = owner_service.search_owners(db, last_name, pagination)
    return [OwnerListOut.model_validate(o) for o in owners]


@router.get("/{owner_id}", response_model=OwnerDetailOut)
def get_owner(owner_id: int, db: Session = Depends(get_db)) -> OwnerDetailOut:
    return owner_service.get_owner_detail(db, owner_id)


@router.put("/{owner_id}", response_model=OwnerOut)
def update_owner(owner_id: int, data: OwnerCreate, db: Session = Depends(get_db)) -> OwnerOut:
    owner = owner_service.update_owner(db, owner_id, data)
    return OwnerOut.model_validate(owner)
