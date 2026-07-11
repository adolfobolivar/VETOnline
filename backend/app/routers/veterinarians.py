from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.pagination import Pagination, pagination_params
from app.schemas.veterinarian import VeterinarianOut
from app.services import veterinarian_service

router = APIRouter(prefix="/veterinarians", tags=["veterinarians"])


@router.get("", response_model=list[VeterinarianOut])
def list_veterinarians(
    pagination: Pagination = Depends(pagination_params),
    db: Session = Depends(get_db),
) -> list[VeterinarianOut]:
    return veterinarian_service.list_veterinarians(db, pagination)
