"""Importing this package registers every ORM model with Base.metadata. A model that's never
imported anywhere never gets registered, and SQLAlchemy can't resolve a ForeignKey pointing at
a table it doesn't know about yet — import every model module here, and import this package
wherever the app starts up (app/main.py), rather than relying on routers/services to import
exactly the right set of models transitively."""

from app.db.models.owner import Owner
from app.db.models.pet import Pet
from app.db.models.pet_type import PetType
from app.db.models.specialty import Specialty
from app.db.models.vet_specialty import vet_specialty
from app.db.models.veterinarian import Veterinarian
from app.db.models.visit import Visit

__all__ = ["Owner", "Pet", "PetType", "Specialty", "Veterinarian", "Visit", "vet_specialty"]
