from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.pet import PetCreate, PetOut, PetUpdate
from app.services import pet_service

router = APIRouter(prefix="/owners/{owner_id}/pets", tags=["pets"])


@router.post("", response_model=PetOut, status_code=201)
def add_pet(owner_id: int, data: PetCreate, db: Session = Depends(get_db)) -> PetOut:
    pet = pet_service.add_pet(db, owner_id, data)
    return PetOut.model_validate(pet)


@router.put("/{pet_id}", response_model=PetOut)
def update_pet(owner_id: int, pet_id: int, data: PetUpdate, db: Session = Depends(get_db)) -> PetOut:
    pet = pet_service.update_pet(db, owner_id, pet_id, data)
    return PetOut.model_validate(pet)
