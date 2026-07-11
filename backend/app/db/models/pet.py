from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.owner import Owner
    from app.db.models.pet_type import PetType
    from app.db.models.visit import Visit


class Pet(Base):
    __tablename__ = "pet"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    birth_date: Mapped[date] = mapped_column(Date)
    owner_id: Mapped[int] = mapped_column(ForeignKey("owner.id"))
    pet_type_id: Mapped[int] = mapped_column(ForeignKey("pet_type.id"))

    owner: Mapped["Owner"] = relationship(back_populates="pets")
    pet_type: Mapped["PetType"] = relationship()
    # UC-005 BR-001: visits ordered chronologically (ascending visit_date).
    visits: Mapped[list["Visit"]] = relationship(back_populates="pet", order_by="Visit.visit_date")
