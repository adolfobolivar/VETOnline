"""seed pet types and specialties

Revision ID: 995f69f8014c
Revises: 154c712d7b1b
Create Date: 2026-07-10

Reference/lookup data the use cases assume is pre-populated: PET_TYPE (UC-007 precondition —
"at least one pet type is configured") and SPECIALTY (UC-002 BR-002, listed alphabetically per
vet). Values are the classic Spring PetClinic reference set, since this project is an explicit
serverless rebuild of it (vision.md).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "995f69f8014c"
down_revision: Union[str, None] = "154c712d7b1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PET_TYPES = ["bird", "cat", "dog", "hamster", "lizard", "snake"]
SPECIALTIES = ["dentistry", "radiology", "surgery"]


def upgrade() -> None:
    pet_type = sa.table("pet_type", sa.column("name", sa.String))
    specialty = sa.table("specialty", sa.column("name", sa.String))

    op.bulk_insert(pet_type, [{"name": name} for name in PET_TYPES])
    op.bulk_insert(specialty, [{"name": name} for name in SPECIALTIES])


def downgrade() -> None:
    pet_type = sa.table("pet_type", sa.column("name", sa.String))
    specialty = sa.table("specialty", sa.column("name", sa.String))

    op.execute(specialty.delete().where(specialty.c.name.in_(SPECIALTIES)))
    op.execute(pet_type.delete().where(pet_type.c.name.in_(PET_TYPES)))
