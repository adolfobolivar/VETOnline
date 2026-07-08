# CLAUDE.md

This file contains guidelines and common commands for AI assistants (like Claude/Copilot) working on the **VETOnline**
project.

**VETOnline is an internal practice-management CRUD tool for a single veterinary clinic** — a serverless rebuild of
the classic Spring PetClinic reference application. Full context lives in `docs/guidelines/vision.md`; read it before
proposing new features. In particular, the following are **out of scope** unless a use case is added for them first:
Pet Owner or Veterinarian self-service logins/portals, owner-initiated appointment booking, messaging/reviews/social
features, and multi-clinic/multi-tenant support.

---

## 📚 Specifications (source of truth)

This project is built specs-first. Before implementing or changing behavior, check:

- `docs/guidelines/vision.md` — scope, actors, objectives, explicit non-goals.
- `docs/guidelines/requirements.md` — functional/non-functional requirements and constraints catalog (FR-xxx,
  NFR-xxx, C-xxx).
- `docs/guidelines/entity_model.md` — ER diagram and attribute tables for every persisted entity (Owner, Pet,
  PetType, Visit, Veterinarian, Specialty, VetSpecialty). Clinic User accounts live in Cognito, not this schema.
- `docs/guidelines/use_cases.puml` — one-page PlantUML overview of actors (Visitor, Clinic User) and all 11 use
  cases; a visual index, not a replacement for the detailed specs in `docs/use-cases/`.
- `docs/guidelines/architecture.md` — tech stack, layering, connection management, auth boundary, pagination
  contract, case-sensitivity/collation decisions.
- `docs/guidelines/testing.md` — testing strategy, fixture requirements, and the UC↔test traceability matrix.
- `docs/guidelines/design-system.md` and `docs/guidelines/design-mockup.html` — color/type/component tokens for the
  frontend, plus a working, self-contained reference build (open the `.html` directly in a browser). Any UI work
  follows this, not ad hoc styling.
- `aiup-fastapi-react/` — the Construction-phase plugin for this stack: `/alembic-migration`,
  `/implement-backend`, `/implement-frontend`, `/terraform-module`, `/pytest-test`, `/playwright-test`. Use these
  rather than implementing a use case by hand — each skill already encodes the `DO NOT`s in this file.
- `docs/use-cases/UC-001` through `UC-011` — one file per use case (main flow, alternative flows, business rules).
  Every backend/frontend behavior change should map to a business rule (`BR-xxx`) in one of these files; if it
  doesn't, either the code or the use case is wrong.

---

## 🏗️ Architecture Overview

- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic.
- **Frontend:** React (Single Page Application).
- **Infrastructure (IaC):** Terraform.
- **AWS Serverless Stack:** AWS Lambda, API Gateway, S3, CloudFront, Amazon Aurora Serverless v2 (PostgreSQL), Amazon Cognito.
- **Auth model:** Cognito Authorizer at API Gateway (REST API) handles authentication only (single "Clinic User" role
  today, see UC-011). Login/session/refresh behavior is specified in UC-011; unauthenticated/expired requests surface
  as the error flow in UC-010 (A3).
- **Prototype-phase trade-offs:** long-lived AWS keys instead of OIDC in CI, no automated alerting, no WAF, and manual
  canary rollback are deliberate, temporary choices for shipping a feedback prototype — see architecture.md §0 before
  "fixing" any of them.

---

## 💻 Build and Run Commands

### Backend (FastAPI)

```bash
cd backend
uv sync
uv run alembic upgrade head   # apply schema + reference-data migrations to your local DB
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

### Infrastructure (Terraform)

```bash
cd terraform/environments/dev
terraform init
terraform plan   # reads ./input.yaml automatically, no -var-file needed
terraform apply
```

---

## 🧪 Testing and Quality Commands

### Backend Testing (Pytest) & Static Analysis

```bash
cd backend
# Unit tests (isolated) + integration tests (ephemeral Postgres via testcontainers, mocked AWS via moto)
uv run pytest

# Static Type Checking
uv run mypy app/

# Linting and Formatting
uv run ruff check app/
uv run ruff format app/
```

### Frontend & E2E Testing (Playwright)

```bash
cd frontend
# Run functional E2E and visual regression tests
npx playwright test

# Update visual regression baseline images
npx playwright test --update-snapshots
```

### Infrastructure Validation (Terraform)

```bash
cd terraform/environments/dev
terraform validate
tflint
checkov -d .
```

---

## 📝 Code Style and Architectural Guidelines

### 1. Python / Backend (FastAPI)

- **Typing:** Use strict static typing for all function arguments and return types. `mypy` must pass without errors.
- **Validation:** Use Pydantic models for all API request/response boundaries (types, required fields, regex patterns
  like the 10-digit telephone). Cross-record business rules that Pydantic can't express (duplicate pet name per
  owner, owner/pet ownership consistency, birth date not in the future) belong in a service/domain layer between the
  routers and the SQLAlchemy models — not inline in routers, not in Pydantic schemas.
- **ORM:** Use SQLAlchemy. Manage database sessions securely via dependency injection (`Depends`) in FastAPI.
- **Case sensitivity:** Don't rely on default collation without checking the use case. Last-name prefix search
  (UC-004) is case-sensitive (Postgres's default `LIKE`, no extra work needed). Duplicate pet-name detection
  (UC-007/UC-008) is case-insensitive and needs an explicit `LOWER()`-based constraint or `citext` — a plain
  `UNIQUE` constraint is case-sensitive and will silently violate the rule.
- **Pagination:** Infinite-scroll endpoints (vets, owners) accept `offset`/`limit`; default `limit` is 20, capped at
  100 server-side regardless of what the client requests.
- **Schema changes & seed data:** Every schema change is an Alembic migration next to the SQLAlchemy models — never
  hand-edit the database. Reference/lookup data (pet types, vet specialties) is seeded via Alembic data migrations in
  the same chain, not a separate script.
- **Serverless Optimization:**
  - Initialize database connections and heavy configurations in the global scope (outside the Lambda handler) to
    mitigate Cold Starts.
  - Keep Lambda reserved concurrency bounded and the SQLAlchemy pool small (`pool_size=1` or `NullPool`) so
    concurrent invocations can't exhaust Aurora's `max_connections`. Don't reach for RDS Proxy until traffic actually
    requires it.
  - Keep Lambda deployment packages small. Do not package `boto3` or `botocore` as they are provided by the AWS
    Lambda runtime environment.

### 2. React / Frontend

- **Components:** Use functional components and React Hooks. Avoid class components.
- **Error Handling:** Implement React Error Boundaries to catch UI crashes and display friendly error views (refer to
  UC-010, including the 401/unauthorized variant in A3). Never strand the user on a blank screen.
- **API Calls:** Handle API errors gracefully. Ensure JWT tokens from Cognito are securely attached to backend
  requests (UC-011); on a 401, attempt the silent refresh described in UC-011 A2 before falling back to the login
  redirect.

### 3. Infrastructure as Code (Terraform)

- **No Hardcoding:** Never hardcode IPs, CIDR blocks, or Availability Zones in resource blocks. Values come from each
  environment's `input.yaml` (read via `yamldecode(file(...))` into `local.input`), not HCL `.tfvars` files.
- **State:** Terraform state is remote (S3 + DynamoDB lock table) per environment, never local.
- **Security:** Follow the Principle of Least Privilege for IAM roles. Pass sensitive variables (like DB passwords)
  via AWS Secrets Manager, not plain text.
- **Tagging:** Every resource must get `Environment`, `Project`, `Owner`, and `ManagedBy` tags via provider-level
  `default_tags` — don't tag resources individually.

### 4. Testing Strategy (Shift-Left)

- Ensure all models, business rules, and edge cases are covered by Unit and Integration Tests. Every use case's
  alternative/failure flows need coverage, not just its main success scenario.
- Backend integration tests run against an ephemeral Postgres container, never SQLite — SQLite's case-insensitive
  `LIKE` would mask a real bug in UC-004's case-sensitive search.
- FastAPI integration tests bypass the API Gateway Cognito Authorizer entirely, so they cannot and should not assert
  401 behavior; that lives in E2E tests against the deployed API.
- Frontend layout and UI bugs are caught via Playwright's native visual regression feature.
- Track coverage against `docs/guidelines/testing.md` §7 (the use-case traceability matrix) — a use case isn't "done"
  until every row it appears in has a test.
- The CI/CD pipeline enforces a strict "No Pass, No Deploy" rule across static analysis, infra validation, unit
  tests, integration tests, and E2E tests.
