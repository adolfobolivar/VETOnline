---
name: implement-backend
description: >
  Implements a use case's backend: FastAPI router, Pydantic request/response schemas, service/domain layer, and
  SQLAlchemy models/queries. Use when the user asks to "implement the backend for UC-xxx", "build the API endpoint",
  "add a FastAPI route", "write the service layer", or mentions FastAPI implementation, Pydantic schemas, or
  SQLAlchemy queries for a specific use case.
---

# Implement Backend

## Instructions

Implement the backend for use case $ARGUMENTS using FastAPI, Pydantic, and SQLAlchemy, following the three-layer
split in `docs/guidelines/architecture.md` §2.3: thin routers, Pydantic for contract validation only, business rules
in a service/domain layer. Don't create tests here — use `/pytest-test`. Don't create or alter migrations here — use
`/alembic-migration` first if the schema isn't ready.

## DO NOT

- Put cross-record business rules in Pydantic schemas or inline in routers. Duplicate pet-name checks, owner/pet
  ownership consistency, and "not in the future" date checks belong in the service/domain layer (architecture.md
  §2.3) — Pydantic only validates types, required fields, and single-field patterns (e.g. the 10-digit telephone
  regex).
- Re-implement JWT validation in FastAPI. The Cognito Authorizer at API Gateway already rejects missing/invalid JWTs
  with 401 before the request reaches this code (architecture.md §2.2) — don't add redundant auth-checking
  middleware for it. There is currently one Clinic User role, so no per-endpoint authorization logic is needed either
  (architecture.md §2.2) unless the use case says otherwise.
- Rely on default collation without checking the use case first. Last-name prefix search (UC-004) is case-sensitive
  (Postgres's default `LIKE` — no extra code needed); duplicate pet-name detection (UC-007/UC-008) is
  case-insensitive and depends on the `LOWER()`/`citext` constraint from the migration — query it consistently with
  how it was constrained, don't re-derive the rule from scratch (architecture.md §2.4).
- Forget the pagination contract. Infinite-scroll endpoints (vets, owners) take `offset`/`limit`, defaulting to 20
  and capped at 100 server-side regardless of what the client requests (architecture.md §2.2, requirements.md
  NFR-001) — don't return an unbounded result set.
- Cause N+1 queries where the use case specifies eager loading — e.g. UC-005 explicitly requires loading an owner
  with their pets and each pet's visits together, not lazily per-pet.

## Workflow

1. Read the target use case from `docs/use-cases/UC-*.md` — main success scenario, every alternative flow, business
   rules (`BR-xxx`), pre/postconditions. The response payloads and status codes for each alternative flow are not
   optional detail — they're the spec.
2. Read the relevant entities and constraints from `docs/guidelines/entity_model.md`.
3. Check existing backend code (routers, schemas, services, models) for established patterns — follow them rather
   than introducing a new style.
4. Define or extend the Pydantic request/response schemas, enforcing only what Pydantic can express natively.
5. Implement any cross-record business rules in the service/domain layer, raising domain-specific exceptions (not
   raw `HTTPException`) that the router translates to responses.
6. Implement the SQLAlchemy queries/models, matching `entity_model.md` exactly and respecting the case-sensitivity
   rule for this specific query.
7. Wire the FastAPI router: parse/validate via Pydantic → delegate to the service layer → map the result or a raised
   domain exception to the exact HTTP status and payload the use case's flows specify (e.g. UC-007 A1's `"already
   exists"` field error, UC-005 A1's 404).
8. Apply the pagination contract for any list/infinite-scroll endpoint.
9. Run the backend locally (`uv run uvicorn app.main:app --reload`) and manually exercise the main flow and every
   alternative flow. **If any flow fails, or its status/payload doesn't match the use case exactly, fix it and
   re-run.** Repeat until every flow — main and every alternative — passes; don't consider the use case implemented
   while any of them is broken.

## Example: Domain Exception → HTTP Response (UC-007)

The thin-router / domain-exception pattern referenced throughout this skill, made concrete with UC-007 BR-001
(case-insensitive duplicate pet name → the `"already exists"` field error). Register exception handlers once in
`main.py` so individual routers never need a `try`/`except` — that's what keeps them thin.

```python
# app/services/exceptions.py
class DomainError(Exception):
    """Base for business-rule violations the router layer translates to HTTP responses."""

class DuplicateNameError(DomainError):
    def __init__(self, field: str, message: str = "already exists"):
        self.field = field
        self.message = message

class NotFoundError(DomainError):
    pass


# app/services/pet_service.py
def add_pet(db: Session, owner_id: int, data: PetCreate) -> Pet:
    exists = (
        db.query(Pet)
        .filter(Pet.owner_id == owner_id, func.lower(Pet.name) == data.name.lower())
        .first()
    )
    if exists:
        raise DuplicateNameError(field="name")
    pet = Pet(owner_id=owner_id, **data.model_dump())
    db.add(pet)
    db.commit()
    return pet


# app/main.py — registered once, applies to every router
@app.exception_handler(DuplicateNameError)
async def duplicate_name_handler(request: Request, exc: DuplicateNameError):
    return JSONResponse(status_code=400, content={"field": exc.field, "error": exc.message})

@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"error": "not found"})


# app/routers/pets.py — thin: parse/validate, delegate, nothing else
@router.post("/owners/{owner_id}/pets", status_code=201)
def create_pet(owner_id: int, data: PetCreate, db: Session = Depends(get_db)):
    pet = pet_service.add_pet(db, owner_id, data)
    return PetOut.model_validate(pet)
```

Follow this shape for the other domain exceptions this project needs (e.g. an ownership-mismatch error for UC-009
BR-003) — one small exception class per business rule, one handler each, routers stay free of `try`/`except`.

## Resources

- `docs/guidelines/architecture.md` §2.2–§2.4 — layering, auth boundary, pagination contract, case sensitivity,
  connection management.
- `docs/guidelines/entity_model.md` — entities, columns, constraints.
- `docs/use-cases/UC-*.md` — the actual behavior to implement.
- Context7 (installed via `aiup-core`) for FastAPI/SQLAlchemy/Pydantic library documentation.
- If configured, use the AWS Documentation MCP server for Cognito JWT claim structure (see
  `../../rules/mcp-servers.md`).
