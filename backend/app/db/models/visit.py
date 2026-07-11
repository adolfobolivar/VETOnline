from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.pet import Pet


class Visit(Base):
    __tablename__ = "visit"

    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(ForeignKey("pet.id"))
    visit_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(500))

    pet: Mapped["Pet"] = relationship(back_populates="visits")
