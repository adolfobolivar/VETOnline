from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.pet import Pet


class Owner(Base):
    __tablename__ = "owner"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(80))
    telephone: Mapped[str] = mapped_column(String(10))

    # UC-005 BR-002: pets ordered alphabetically by name.
    pets: Mapped[list["Pet"]] = relationship(back_populates="owner", order_by="Pet.name")
