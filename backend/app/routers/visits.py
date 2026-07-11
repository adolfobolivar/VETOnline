from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.visit import VisitCreate, VisitOut
from app.services import visit_service

router = APIRouter(prefix="/owners/{owner_id}/pets/{pet_id}/visits", tags=["visits"])


@router.post("", response_model=VisitOut, status_code=201)
def add_visit(owner_id: int, pet_id: int, data: VisitCreate, db: Session = Depends(get_db)) -> VisitOut:
    visit = visit_service.add_visit(db, owner_id, pet_id, data)
    return VisitOut.model_validate(visit)
