---
name: alembic-migration
description: >
  Creates versioned Alembic migration scripts (schema and reference-data/seed migrations) from the entity model.
  Use when the user asks to "create a migration", "add a database migration", "write an Alembic migration", "seed
  reference data", "add a column", or mentions Alembic, schema migration, or database schema changes.
---

# Alembic Migration

## Instructions

Create an Alembic migration for $ARGUMENTS (an entity, or a specific schema change to an existing entity) based on
`docs/guidelines/entity_model.md`. Don't implement application code in this skill — that's `/implement-backend`.

## DO NOT

- Add columns or attributes not defined in `entity_model.md` — the migration must match the ER diagram's attribute
  tables exactly, including the Length/Precision and Validation Rules columns.
- Use a plain `UNIQUE` constraint where `entity_model.md` specifies case-insensitive uniqueness (e.g. `PET`'s
  `(owner_id, name)` constraint) — use a functional unique index (`LOWER(...)`) or the `citext` extension, per
  architecture.md §2.4. A plain `UNIQUE` is case-sensitive and will silently violate the business rule.
- Hand-edit the database directly, or skip writing a migration "just this once" — every schema change is a
  version-controlled Alembic migration (architecture.md §2.4).
- Forget reference/seed data. `PET_TYPE` and `SPECIALTY` are lookup tables the use cases assume are pre-populated
  (e.g. UC-007's precondition) — seed them via a data migration in the same chain, not a separate ad hoc script.

## Workflow

1. Read the target entity's attribute table and any `**Constraints:**` note from `docs/guidelines/entity_model.md`.
2. Check existing migrations under `backend/alembic/versions/` for naming and style conventions, and find the
   current migration head.
3. Generate the migration with `alembic revision --autogenerate -m "<description>"`, or write it by hand where
   autogenerate can't express the constraint (functional indexes, `citext`).
4. Translate `entity_model.md`'s columns into SQLAlchemy/Alembic definitions:
   - `Long` / `19` → `BigInteger`, primary key with `Sequence` → server-generated identity/sequence.
   - `String` / `N` → `String(N)`.
   - `Date` → `Date`; `DateTime` → `DateTime`.
   - `Not Null` → `nullable=False`; `Optional` → `nullable=True`.
   - `Foreign Key (TABLE.id)` → `ForeignKey("table.id")`.
   - `Not Null, Unique` → `unique=True`, or a named `UniqueConstraint` for composite keys (e.g. `VET_SPECIALTY`).
5. For any `**Constraints:**` note (e.g. `PET`'s case-insensitive `(owner_id, name)` uniqueness, `VET_SPECIALTY`'s
   composite primary key), implement it as an explicit functional index or table-level constraint — not a comment.
6. For a lookup entity with known seed values (`PET_TYPE`, `SPECIALTY`), add a data migration (`op.bulk_insert` or
   `op.execute`) in the same migration or immediately after it in the chain.
7. Apply the migration against a local/test Postgres instance (`alembic upgrade head`) and verify it applies
   cleanly; run `alembic downgrade -1` to confirm the downgrade path works too.
8. Diff the resulting schema against `entity_model.md` column-by-column to confirm nothing was missed or invented.

## Resources

- `docs/guidelines/entity_model.md` — source of truth for schema.
- `docs/guidelines/architecture.md` §2.4 — connection management, case sensitivity/collation, and how migrations run
  in the deployed pipeline (a dedicated migration Lambda, since Aurora has no public access).
- If configured, use the AWS Documentation MCP server for Aurora/RDS-Postgres-specific guidance (see
  `../../rules/mcp-servers.md`).
