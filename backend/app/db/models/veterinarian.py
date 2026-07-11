from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.vet_specialty import vet_specialty

if TYPE_CHECKING:
    from app.db.models.specialty import Specialty


class Veterinarian(Base):
    __tablename__ = "veterinarian"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))

    # UC-002 BR-002: specialties listed alphabetically by name, per vet.
    specialties: Mapped[list["Specialty"]] = relationship(
        secondary=vet_specialty, back_populates="veterinarians", order_by="Specialty.name"
    )
