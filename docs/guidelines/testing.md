# Testing Guidelines - VETOnline Serverless

This document establishes the strategy, tools, and testing standards to ensure the quality, reliability, and stability of the VETOnline system under the AWS Serverless architecture with Python and React.

---

## 1. General Strategy (The Testing Pyramid)

Our strategy is based on the automated testing pyramid, adapted to an ephemeral microservices environment (AWS Lambda). We aim to detect errors as early as possible (Shift-Left Testing) to reduce the cost of correction and the impact on production.

1. **Static Analysis (Base):** Validation of types, syntax, and style before execution.
2. **Unit Tests:** Validation of pure logic, models, and data contracts in isolation.
3. **Integration Tests:** Validation of API controllers (FastAPI) and the interaction with the database (SQLAlchemy) or mocked AWS services.
4. **End-to-End (E2E) and Visual Tests (Top):** Validation of complete user flows from the React interface through to persistence, including visual regression.

Coverage is tracked against the use cases in `docs/use-cases/`, not just against code paths — see Section 7 for the traceability matrix. A use case is not considered covered on the strength of its main success scenario alone: its alternative flows (validation errors, not-found, duplicates, unauthorized access, etc.) must each have a corresponding test.

---

## 2. Static Tests (Code Quality and Typing)

Python is a dynamic language, so static analysis acts as our "compilation phase" to catch errors before runtime.

* **Typing Tool:** `mypy` (or optionally `pyright`). All business code must contain clear type annotations.
* **Formatter and Linter:** `ruff` (`ruff check` and `ruff format`) to ensure stylistic consistency (PEP 8), matching the single tooling choice used in CI (see `CLAUDE.md`).
* **Golden Rule:** The CI/CD pipeline will fail immediately if type inconsistencies or critical style violations exist.
* **Dependency Management:** `uv` is the package manager for all Python tooling (`uv sync`, `uv run pytest`, `uv run mypy`, `uv run ruff ...`), for both local development and CI/CD.

---

## 3. Unit Tests (Backend)

Focused on testing isolated functions, pure business logic, and model validations without touching external services or databases.

* **Framework:** `pytest`
* **Contract Validation:** Pydantic models are unit tested to ensure that business rules at the API boundary (e.g. ID number format, emails, pet types) natively reject invalid data.
* **Isolation:** The native `unittest.mock` module (or `pytest-mock`) is used to replace heavy components or network calls.

---

## 4. Integration Tests

In a Serverless environment, integration tests validate how our logic interacts with system dependencies locally, avoiding real calls to AWS infrastructure during the basic testing phase.

### 4.1. API Tests (FastAPI)
* We use the FastAPI test client backed by `httpx`.
* Full HTTP requests (GET, POST, etc.) are simulated against the routers to verify HTTP status codes (200, 201, 400, 404) and JSON response structures.

### 4.2. Database Integration (SQLAlchemy + Aurora)
* **Isolation Strategy:** Tests are not run directly against the production or shared AWS development database during basic CI/CD.
* **Pytest Fixtures:** Tests run against an **ephemeral PostgreSQL container** (e.g., via `testcontainers-python`), not SQLite. SQLite's default `LIKE` is case-insensitive, the opposite of Postgres's default (case-sensitive) behavior — since UC-004 BR-001 requires case-sensitive prefix matching and UC-007/UC-008 BR-001 require case-insensitive duplicate-name detection (see architecture.md §2.4, "Case Sensitivity and Collation"), a suite running against SQLite could pass while the same code behaves differently against real Aurora. An injected dependency runs `alembic upgrade head` (schema + reference-data migrations, per architecture.md §2.4) against the container, opens a clean SQLAlchemy session for each test, and performs a rollback when the test finishes.

### 4.3. AWS Services (Boto3)
* To test interactions with S3 or EventBridge, the `moto` library (Mock AWS Services) or dependency injection is used to ensure the code does not attempt to authenticate with AWS during integration tests.

### 4.4. Authentication Boundary (Cognito Authorizer)
The Cognito Authorizer runs at API Gateway, in front of Lambda/FastAPI (architecture.md §2.2). This has a direct testing consequence:
* FastAPI integration tests (4.1) call the ASGI app directly via `httpx`, bypassing API Gateway entirely — they **cannot** exercise 401 rejection for a missing/invalid JWT (UC-011 BR-003). Asserting that behavior here would be a false sense of coverage; don't write it here.
* Authentication enforcement is instead verified by an E2E test (Section 5) against the real, deployed API Gateway, and by an infrastructure check (Section 6) confirming every protected route is wired to the Cognito Authorizer.
* There is currently a single Clinic User role (UC-011 BR-002), so no role-based authorization unit tests are needed yet. If a second role is introduced, add authorization unit tests against the service/domain layer (architecture.md §2.3) at that point.

---

## 5. End-to-End (E2E) and Visual Regression Tests

These tests validate the system from the perspective of the real user, deploying the React frontend and connecting it to a controlled API environment.

* **Main Framework:** `Playwright`
* **Browser Scope:** Only the Chromium project is configured/run (requirements.md C-018 — Chrome is the only supported browser). Firefox and WebKit projects are not added to `playwright.config`, which also keeps CI runtime down.
* **Functional Tests:** Scripts are written to simulate complete user flows, and must cover each use case's alternative/failure flows, not only its main success scenario (see Section 7).
* **Auth Flows:** Covers UC-011 end to end (login, invalid credentials, session expiry/refresh, logout) against a dedicated test Cognito user pool, plus a check that an unauthenticated request to a protected page is rejected with HTTP 401 and redirected to login (UC-010 A3).

### 5.1. Visual Regression (Cost-Control Strategy)
To avoid "visual blind spots" (CSS errors, form misalignment, or overlapping text) reported in previous phases, Playwright's native screenshot assertion is enabled:

* **Native Implementation:** Screenshot validation assertions built into the framework are used.
* **Workflow:** 1. Approved "baseline" or reference images are stored directly in the Git repository under version control.
  2. When the test runs in the pipeline, a new screenshot of the component or page is taken and compared pixel by pixel against the baseline.
  3. If there is an unauthorized visual change above the tolerance threshold, the test fails.
* **Scalability:** If the Git repository grows dramatically in size due to image binaries, this suite will be migrated to the free tier of a specialized tool such as Chromatic or Percy.

---

## 6. Automation in the Deployment Pipeline (CI/CD)

No code is deployed to the AWS Serverless infrastructure via Terraform without having passed all quality control steps. The sequential order in the pipeline (e.g. GitHub Actions) is:

1. **Linting and Typing:** `ruff` and `mypy`.
2. **Infrastructure Validation:** `terraform validate` plus `tflint`/`checkov` against the Terraform code, catching missing mandated tags, hardcoded values, or overly permissive IAM roles before anything is applied (architecture.md §5.3).
3. **Backend Suite:** `pytest` (Unit + Integration with an ephemeral Postgres container, per Section 4.2).
4. **Frontend/E2E Suite:** React application build + Execution of Playwright functional and visual regression scenarios.
5. **Deploy Approval:** If all previous steps return a success code, the pipeline proceeds to execute the infrastructure update, run the Alembic migration Lambda, and shift traffic to the new Lambda version behind a canary alias (architecture.md §4.2).

---

## 7. Use Case Traceability

Every use case in `docs/use-cases/` must have test coverage tracked against this table. It is the primary artifact for
confirming "the code does what the use case says," and should be updated whenever a use case or its business rules
change.

| Use Case | Primary Test Layer(s) | Key Business Rules to Cover |
| :--- | :--- | :--- |
| UC-001 View Welcome Page | E2E + Visual | Static content, nav links, anonymous access |
| UC-002 View Veterinarians | Unit, Integration, E2E + Visual | BR-001 lazy loading/pagination, BR-002 specialty ordering, BR-003 anonymous access |
| UC-003 Register New Owner | Unit, Integration, E2E | BR-001 mandatory fields, BR-002 telephone regex, BR-003 server-assigned id, BR-004 auth required |
| UC-004 Find Owners by Last Name | Unit, Integration, E2E | BR-001 case-sensitive prefix match, BR-002 lazy loading, BR-003 empty search returns all, A2 single-match redirect, A3 not-found, BR-004 auth required |
| UC-005 View Owner Details | Integration, E2E | BR-001 visit ordering, BR-002 pet ordering, A1 not-found (404), BR-003 auth required |
| UC-006 Update Owner | Unit, Integration, E2E | BR-001 mandatory fields, BR-002 telephone regex, BR-003 auth required |
| UC-007 Add Pet to Owner | Unit, Integration, E2E | BR-001 unique name (case-insensitive), BR-002 birth date not future, BR-003 type required on create, BR-004 auth required |
| UC-008 Update Pet | Unit, Integration, E2E | BR-001 unique name (case-insensitive), BR-002 birth date not future, BR-003 type optional on update, BR-004 auth required |
| UC-009 Book Visit for Pet | Unit, Integration, E2E | BR-001 description required, BR-002 default date, BR-003 owner/pet consistency, BR-004 auth required |
| UC-010 View Application Error | Integration, E2E | BR-001 anonymous access, BR-002 nav shell preserved, BR-003 no stack trace leak, BR-004 unauthorized recovery, BR-005 /oups route |
| UC-011 Clinic User Login | E2E (against a test Cognito user pool) | BR-001 Cognito is system of record, BR-003 JWT required, A1 invalid credentials, A2 session expiry/refresh, A3 logout |

Every alternative flow listed for a use case — not just its main success scenario — must have at least one
corresponding test.