from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Pet(Base):
    __tablename__ = "pet"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    birth_date: Mapped[date] = mapped_column(Date)
    owner_id: Mapped[int] = mapped_column(ForeignKey("owner.id"))
    pet_type_id: Mapped[int] = mapped_column(ForeignKey("pet_type.id"))
