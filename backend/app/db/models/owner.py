from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Owner(Base):
    __tablename__ = "owner"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(80))
    telephone: Mapped[str] = mapped_column(String(10))
