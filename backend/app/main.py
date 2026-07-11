import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from app.db.models import (  # noqa: F401 - registers ORM models before use
    Owner,
    Pet,
    PetType,
    Specialty,
    Veterinarian,
    Visit,
    vet_specialty,
)
from app.routers import demo, owners, pet_types, pets, veterinarians, visits
from app.services.exceptions import DuplicateNameError, FutureBirthDateError, NotFoundError

# No auth middleware here: the Cognito Authorizer at API Gateway already rejects
# missing/invalid JWTs with 401 before a request reaches this code (architecture.md §2.2),
# and there is currently only one Clinic User role, so no per-endpoint authorization logic
# is needed either.
app = FastAPI(title="VETOnline API")

# Scoped to the CloudFront distribution domain per architecture.md §2.2, via the
# CORS_ALLOW_ORIGIN env var (Terraform, application module). Defaults to "*" only when unset
# (e.g. running locally without that var). The Authorization header carries a bearer JWT (not
# cookies), so allow_credentials is intentionally left at its default False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ALLOW_ORIGIN", "*")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(owners.router)
app.include_router(pets.router)
app.include_router(visits.router)
app.include_router(veterinarians.router)
app.include_router(pet_types.router)
app.include_router(demo.router)


# Registered once here, not per-router, so individual routers never need a try/except — that's
# what keeps them thin (architecture.md §2.3).
@app.exception_handler(DuplicateNameError)
async def duplicate_name_handler(request: Request, exc: DuplicateNameError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"field": exc.field, "error": exc.message})


@app.exception_handler(FutureBirthDateError)
async def future_birth_date_handler(request: Request, exc: FutureBirthDateError) -> JSONResponse:
    # Mirrors FastAPI's own 422 validation-error shape (UC-007 A2 calls this a "type-mismatch
    # error") even though it's raised from the service layer, not Pydantic itself.
    return JSONResponse(
        status_code=422,
        content={"detail": [{"loc": ["body", exc.field], "msg": exc.message, "type": "value_error"}]},
    )


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": exc.message})


# ASGI adapter for AWS Lambda (architecture.md §2.3) — API Gateway invokes this, not uvicorn,
# once deployed. uvicorn (dev-only dependency) is for local development instead.
handler = Mangum(app)
