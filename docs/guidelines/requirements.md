# Requirements Catalog: VETOnline

This catalog is derived from `vision.md`, `architecture.md`, `testing.md`, and `docs/use-cases/UC-001` through
`UC-011`. It exists to make functional requirements, non-functional requirements, and constraints traceable in one
place — the functional requirements table is intentionally a thin summary layer (full detail, alternative flows, and
business rules live in the use-case specs); the non-functional requirements and constraints tables are the actual gap
this document fills, since that information was previously scattered as prose across `vision.md` and
`architecture.md`'s "Prototype-Phase Trade-offs" section.

---

## Functional Requirements (FR)

One row per use case. See `docs/use-cases/UC-0XX-*.md` for the full main flow, alternative flows, and business rules.

| ID | Title | User Story | Use Case | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FR-001 | View Welcome Page | As a Visitor, I want to view the welcome page so that I can orient myself and navigate to the main functional areas. | UC-001 | Medium | Open |
| FR-002 | View Veterinarians | As a Visitor, I want to browse the list of veterinarians and their specialties so that I can identify the right specialist for my pet. | UC-002 | Medium | Open |
| FR-003 | Register New Owner | As a Clinic User, I want to register a new pet owner so that their pets and visits can be tracked going forward. | UC-003 | High | Open |
| FR-004 | Find Owners by Last Name | As a Clinic User, I want to search for owners by last name so that I can quickly locate their records. | UC-004 | High | Open |
| FR-005 | View Owner Details | As a Clinic User, I want to view an owner's contact details, pets, and visit history so that I can review their care history in one place. | UC-005 | High | Open |
| FR-006 | Update Owner | As a Clinic User, I want to update an owner's contact information so that the clinic's records stay accurate. | UC-006 | High | Open |
| FR-007 | Add Pet to Owner | As a Clinic User, I want to add a new pet to an existing owner so that the pet's visits and medical information can be tracked. | UC-007 | High | Open |
| FR-008 | Update Pet | As a Clinic User, I want to update a pet's name, birth date, or type so that its record stays accurate. | UC-008 | High | Open |
| FR-009 | Book Visit for Pet | As a Clinic User, I want to record a veterinary visit for a pet so that its medical history is documented. | UC-009 | High | Open |
| FR-010 | View Application Error | As a Visitor, I want to see a friendly error page when something goes wrong so that I'm never stranded on a blank or broken screen. | UC-010 | Medium | Open |
| FR-011 | Clinic User Login | As a Clinic User, I want to log in with my credentials so that I can securely access clinic-management features. | UC-011 | High | Open |

---

## Non-Functional Requirements (NFR)

| ID | Title | Requirement | Category | Priority | Status | Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-001 | Result Set Size Limit | List/search endpoints (veterinarians, owners) must return at most 100 records per request, defaulting to 20 when the client doesn't specify a limit. | Performance | Medium | Open | architecture.md §2.2 |
| NFR-002 | JWT Enforcement on Protected Endpoints | Every request to a clinic-management endpoint (owners, pets, visits) must be rejected with HTTP 401 if it lacks a valid, unexpired Cognito-issued JWT. | Security | High | Open | architecture.md §2.2; UC-011 BR-003 |
| NFR-003 | Encrypted Transport | All traffic between the browser, CloudFront, API Gateway, and the backend must use TLS 1.2 or higher; no endpoint may be served over plain HTTP. | Security | High | Open | architecture.md §1, §2.1-2.2 (CloudFront/API Gateway defaults) |
| NFR-004 | Secrets Storage | Database credentials and any external API keys must be stored in AWS Secrets Manager and injected at runtime; none may appear in source code, environment files, or Terraform state in plaintext. | Security | High | Open | architecture.md §3 |
| NFR-005 | Least-Privilege IAM | Each Lambda function's IAM role must grant only the specific Aurora and CloudWatch actions that function needs; no wildcard (`*`) resource or action grants. | Security | High | Open | architecture.md §3 |
| NFR-006 | Static Analysis Gate | 100% of backend Python code must pass `mypy` and `ruff check` with zero errors before merge. | Maintainability | High | Open | testing.md §2; CLAUDE.md |
| NFR-007 | Use Case Test Coverage | Every alternative/failure flow documented for a use case — not only its main success scenario — must have at least one corresponding automated test, tracked against the traceability matrix in testing.md §7. | Maintainability | High | Open | testing.md §7 |
| NFR-008 | Gradual Deployment Rollout | Production Lambda deployments must shift traffic gradually behind a weighted/canary alias (e.g., 10% for a bake period, then 100%) rather than switching all traffic at once. | Availability | Medium | Open | architecture.md §4.2 |
| NFR-009 | No Deploy on Failed Gate | The CI/CD pipeline must block deployment if any static analysis, infrastructure validation, unit, integration, or E2E test step fails ("No Pass, No Deploy"). | Maintainability | High | Open | testing.md §6; architecture.md §4.2 |
| NFR-010 | API Response Time | 95% of API requests must complete within 1 second when the Lambda execution environment is warm. The first request after scale-up from idle (cold start) is excluded from this target, consistent with architecture.md §2.3 accepting baseline cold-start latency. | Performance | High | Open | Requirements review 2026-07-08 |
| NFR-011 | Application Uptime | The system must maintain 99% uptime during business hours, measured monthly. Tracked manually via CloudWatch Logs/X-Ray review (no automated alerting exists to enforce this — see C-014), consistent with there being no on-call/ops team yet. | Availability | Medium | Open | Requirements review 2026-07-08 |
| NFR-012 | Concurrent User Capacity | The system must support at least 20 concurrent Clinic Users without degradation, sizing Lambda reserved concurrency and Aurora `db_max_capacity` (architecture.md §2.4) accordingly. | Scalability | Medium | Open | Requirements review 2026-07-08 |
| NFR-013 | Backup Retention | Aurora automated backups and point-in-time recovery must retain 7 days of history in `dev` and 14 days in `prod` (architecture.md §2.4). | Availability | Medium | Open | Requirements review 2026-07-08 |

---

## Constraints (C)

| ID | Title | Constraint | Category | Priority | Status | Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C-001 | Backend Stack | Backend must be implemented in Python using FastAPI, SQLAlchemy, and Pydantic. | Technical | High | Open | architecture.md §1 |
| C-002 | Frontend Stack | Frontend must be a React SPA. | Technical | High | Open | architecture.md §1 |
| C-003 | Database Platform | Persistent storage must be Amazon Aurora Serverless v2 (PostgreSQL); schema and reference-data changes are managed via Alembic migrations. | Technical | High | Open | architecture.md §1, §2.4 |
| C-004 | Cloud Provider & IaC | All infrastructure must run on AWS, provisioned entirely via Terraform (no manual console configuration); per-environment inputs come from `input.yaml`, not `.tfvars`. | Technical | High | Open | architecture.md §1, §5.2 |
| C-005 | Identity Provider | User authentication must use Amazon Cognito; there is currently a single Clinic User role with no additional authorization tiers. | Technical | High | Open | architecture.md §1, §2.2; UC-011 BR-002 |
| C-006 | Python Dependency Management | Python dependencies must be managed via `uv` (`uv.lock`), not `pip`/`venv`, in both local development and CI. | Technical | Medium | Open | CLAUDE.md; architecture.md §4.2 |
| C-007 | Single-Tenant Scope | The system supports exactly one veterinary clinic; no multi-clinic or multi-tenant data partitioning is in scope. | Technical | High | Open | vision.md — Explicitly Out of Scope |
| C-008 | No Owner/Vet Self-Service | Pet Owners and Veterinarians have no login, portal, or self-service actions; all their records are managed exclusively by Clinic Users. | Business | High | Open | vision.md — Target Audience, Explicitly Out of Scope |
| C-009 | No Owner-Initiated Booking | Pet Owners cannot request or book visits themselves; all visits are booked by a Clinic User. | Business | High | Open | vision.md — Explicitly Out of Scope; UC-009 |
| C-010 | No Social/Community Features | No messaging, reviews, or community features between owners and the clinic are in scope. | Business | Medium | Open | vision.md — Explicitly Out of Scope |
| C-011 | Prototype Delivery Milestone | The first release must ship as a working prototype for user/leadership feedback before further investment is committed. | Schedule | High | Open | vision.md — Delivery Approach |
| C-012 | CI/CD Credential Model | GitHub Actions authenticates to AWS using long-lived IAM access keys during the prototype phase; OIDC federation is a planned but not-yet-implemented improvement. | Operational | Medium | Deferred | architecture.md §0, §4.2 |
| C-013 | No Perimeter Hardening Services | AWS WAF and other additional perimeter-hardening services are not deployed during the prototype phase. | Operational | Low | Deferred | architecture.md §0, §3 |
| C-014 | No Automated Alerting | No CloudWatch Alarms or SNS notifications are configured; there is no on-call/ops team to receive or act on them during the prototype phase. Issues are investigated manually via logs/traces. | Operational | Medium | Deferred | architecture.md §0, §6 |
| C-015 | Manual Deployment Rollback | Rollback from a bad deployment is a manual action (redeploy the previous Lambda version/alias weight); there is no alarm-triggered automatic rollback. | Operational | Medium | Deferred | architecture.md §0, §4.2 |
| C-016 | Test Database Engine | Backend integration tests must run against an ephemeral PostgreSQL container (e.g., testcontainers), never SQLite, so case-sensitivity behavior matches production. | Technical | High | Open | testing.md §4.2 |
| C-017 | No-Pass-No-Deploy Gate | The CI/CD pipeline must block deployment if any quality-control step fails, across static analysis, infrastructure validation, unit tests, integration tests, and E2E tests. | Operational | High | Open | testing.md §6 |
| C-018 | Browser Support | The frontend only needs to support the latest version of Google Chrome. No cross-browser support (Firefox, Safari, Edge) is required. | Technical | Medium | Open | Requirements review 2026-07-08 |
| C-019 | No Fixed Budget Ceiling | No dollar budget ceiling or automated cost-budget alarm is set for any environment during the prototype phase; spend is tracked (not capped) via the cost-allocation tagging strategy (architecture.md §5.3). | Business | Low | Deferred | Requirements review 2026-07-08 |

---

*All gaps identified in the initial version of this catalog were resolved on 2026-07-08 (NFR-010 through NFR-013,
C-018, C-019).*
