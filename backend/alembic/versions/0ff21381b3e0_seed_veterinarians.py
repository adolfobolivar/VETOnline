"""seed veterinarians

Revision ID: 0ff21381b3e0
Revises: 995f69f8014c
Create Date: 2026-07-13

Reference data for UC-002's precondition ("at least one veterinarian exists in the database").
Real veterinarian records are staff-maintained, not something the app itself creates (no use
case exposes vet management — vision.md: "Veterinarians do not have their own login or actions
in this version of the system"), so this is seeded the same way pet types and specialties are
(995f69f8014c) rather than left for a UI that doesn't exist.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0ff21381b3e0"
down_revision: Union[str, None] = "995f69f8014c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (first_name, last_name, specialty names) — specialty names must already exist from
# 995f69f8014c. Distributed so at least one vet has none (UC-002's "none" display) and at least
# one has more than one (so BR-002's alphabetical-ordering rule has something to actually order).
VETERINARIANS: list[tuple[str, str, list[str]]] = [
    ("Julius", "Hibbert", ["surgery", "dentistry"]),
    ("Nick", "Riviera", ["radiology"]),
    ("Waylon", "Smithers", ["dentistry"]),
    ("Ned", "Flanders", ["surgery"]),
    ("Marge", "Simpson", []),
    ("Seymour", "Skinner", []),
]


def upgrade() -> None:
    bind = op.get_bind()
    veterinarian = sa.table(
        "veterinarian",
        sa.column("id", sa.BigInteger),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
    )
    specialty = sa.table("specialty", sa.column("id", sa.BigInteger), sa.column("name", sa.String))
    vet_specialty = sa.table(
        "vet_specialty",
        sa.column("vet_id", sa.BigInteger),
        sa.column("specialty_id", sa.BigInteger),
    )

    specialty_rows = bind.execute(sa.select(specialty.c.name, specialty.c.id)).all()
    specialty_ids: dict[str, int] = {name: id_ for name, id_ in specialty_rows}

    vet_ids = [
        bind.execute(
            veterinarian.insert()
            .values(first_name=first_name, last_name=last_name)
            .returning(veterinarian.c.id)
        ).scalar_one()
        for first_name, last_name, _ in VETERINARIANS
    ]

    links = [
        {"vet_id": vet_id, "specialty_id": specialty_ids[name]}
        for vet_id, (_, _, names) in zip(vet_ids, VETERINARIANS)
        for name in names
    ]
    if links:
        op.bulk_insert(vet_specialty, links)


def downgrade() -> None:
    bind = op.get_bind()
    veterinarian = sa.table(
        "veterinarian",
        sa.column("id", sa.BigInteger),
        sa.column("first_name", sa.String),
        sa.column("last_name", sa.String),
    )
    vet_specialty = sa.table("vet_specialty", sa.column("vet_id", sa.BigInteger))

    pairs = [(first, last) for first, last, _ in VETERINARIANS]
    vet_ids = [
        row[0]
        for row in bind.execute(
            sa.select(veterinarian.c.id).where(
                sa.tuple_(veterinarian.c.first_name, veterinarian.c.last_name).in_(pairs)
            )
        )
    ]
    if vet_ids:
        op.execute(vet_specialty.delete().where(vet_specialty.c.vet_id.in_(vet_ids)))
        op.execute(veterinarian.delete().where(veterinarian.c.id.in_(vet_ids)))
