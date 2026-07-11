from sqlalchemy import Column, ForeignKey, Table

from app.db.base import Base

# Plain association Table, not a mapped class: entity_model.md's VET_SPECIALTY has no columns
# beyond the (vet_id, specialty_id) composite primary key, so the SQLAlchemy `secondary=`
# many-to-many pattern applies directly (veterinarian.py, specialty.py) rather than needing an
# association-object class.
vet_specialty = Table(
    "vet_specialty",
    Base.metadata,
    Column("vet_id", ForeignKey("veterinarian.id"), primary_key=True),
    Column("specialty_id", ForeignKey("specialty.id"), primary_key=True),
)
