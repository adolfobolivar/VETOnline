from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.vet_specialty import vet_specialty

if TYPE_CHECKING:
    from app.db.models.veterinarian import Veterinarian


class Specialty(Base):
    __tablename__ = "specialty"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    veterinarians: Mapped[list["Veterinarian"]] = relationship(secondary=vet_specialty, back_populates="specialties")
