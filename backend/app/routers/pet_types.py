from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.pet_type import PetTypeOut
from app.services import pet_type_service

router = APIRouter(prefix="/pet-types", tags=["pet-types"])


@router.get("", response_model=list[PetTypeOut])
def list_pet_types(db: Session = Depends(get_db)) -> list[PetTypeOut]:
    pet_types = pet_type_service.list_pet_types(db)
    return [PetTypeOut.model_validate(pt) for pt in pet_types]
