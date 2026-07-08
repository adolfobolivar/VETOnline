# System Architecture: VETOnline (Serverless Edition with Python)

This document describes the software architecture and cloud infrastructure for the VETOnline project, using a 100% Serverless approach hosted on AWS (Amazon Web Services). The primary goal of this architecture is to optimize initial costs, scale automatically based on demand, and separate frontend and backend responsibilities in a modern way.

---

## 0. Prototype-Phase Trade-offs (Read This First)

VETOnline is being delivered as a working prototype to gather feedback from users and leadership before further
investment, not as a hardened production launch. Several decisions below are deliberate, temporary trade-offs for
this phase — they are called out inline as **(prototype phase)** wherever they appear, and are collected here so
they read as conscious choices rather than oversights:

- CI/CD authenticates to AWS with long-lived IAM access keys, not OIDC federation (§4.2).
- No automated alerting (CloudWatch Alarms/SNS) is configured (§6) — there is no on-call/ops team yet to receive or
  act on it.
- AWS WAF and other perimeter-hardening services are not deployed (§3).
- Lambda deployments use a canary rollout, but rollback on a bad deploy is currently manual, since there is no alarm
  to trigger an automatic one (§4.2).

None of these are architectural limitations — they are conscious choices to move fast now, with a clear list of what
to revisit once the prototype earns further investment.

---

## 1. Architecture Overview (Tech Stack)

This iteration of VETOnline adopts a decoupled, event-driven architecture.

| Component | Selected Technology | Purpose |
| :--- | :--- | :--- |
| **Framework (Backend)** | **FastAPI (Python)** | Expose a high-performance RESTful API. |
| **UI (Frontend)** | **React** | SPA (Single Page Application) for user interaction. |
| **Database** | **Amazon Aurora Serverless v2 (PostgreSQL)** | Persistent, relational, and scalable storage. |
| **Persistence (ORM)** | **SQLAlchemy** | Object-relational mapping and SQL query validation in Python. |
| **Authentication** | **Amazon Cognito** | Identity management, registration, and access control (JWT). |
| **Hosting & Compute** | **AWS Lambda + API Gateway (REST API)** | On-demand backend execution and request routing. |
| **Frontend Hosting** | **Amazon S3 + CloudFront** | Static file storage and CDN (Content Delivery Network). |
| **Infrastructure (IaC)** | **Terraform** | Definition, deployment, and versioning of the entire cloud architecture. |
| **Schema Migrations** | **Alembic** | Version-controlled schema changes and reference-data (seed) migrations. |

---

## 2. Component Description (Layers)

### 2.1. Presentation Layer (Frontend)
The client interacts exclusively with a React application.
- **Distribution:** The compiled application (HTML/CSS/JS) resides in an **Amazon S3** bucket.
- **Delivery (CDN):** **Amazon CloudFront** distributes this content through global edge nodes, reducing latency and guaranteeing millisecond load times even during traffic spikes.
- **Client-side authentication:** The AWS Amplify SDK integrates with **Cognito** to manage session state, obtaining the access token (JWT) that will be sent with each request to the backend.
- **SPA Deep-Link Handling:** React Router handles client-side routes (e.g. `/owners/42`) that don't correspond to real objects in the S3 bucket. CloudFront is configured with custom error responses mapping both 403 and 404 origin responses to `/index.html` with an HTTP 200 status, so a direct navigation or browser refresh on any client-side route resolves correctly instead of returning S3's raw "access denied"/"not found" XML.
- **Browser Support:** Only the latest version of Google Chrome is a supported target (requirements.md C-018); no cross-browser compatibility work (Firefox, Safari, Edge) is required for this internal, single-clinic tool.

### 2.2. Network and Routing Layer (API)
- **Amazon API Gateway (REST API):** Acts as the "entry point" for all REST calls made by the frontend. The REST API type (rather than HTTP API) is chosen for its richer feature set — request validation models, resource policies, and a straightforward attachment point for AWS WAF later (see §3) — even though it carries a higher per-request cost than HTTP API. It handles routing, throttling, and — crucially — validates the JWT Token using a Cognito Authorizer before passing the request through to the Python code.
- **CORS Strategy (prototype phase):** The frontend (served from a CloudFront domain) and the API (served from an API Gateway domain) are different origins, so API Gateway is configured with CORS enabled for the specific CloudFront distribution domain, allowing the `Authorization` header and the HTTP methods used by the API. A unifying custom domain (Route53 + ACM certificate) is deliberately deferred — it removes the need for CORS entirely, but the DNS/certificate provisioning isn't worth the setup time while the app is still a prototype under active iteration.
- **Authentication vs. Authorization:** The Cognito Authorizer only performs *authentication* (is this a valid, unexpired token?). Rejections surface as HTTP 401 and are handled by the frontend per UC-010 A3 / UC-011 A2. There is currently a single Clinic User role (UC-011 BR-002), so no additional *authorization* (role/permission) logic is required in the FastAPI application layer. If a second role is introduced later, per-endpoint authorization checks would need to be added explicitly in the application layer — the Cognito Authorizer alone does not enforce them.
- **Pagination Contract:** Endpoints backing infinite-scroll views (UC-002 veterinarians, UC-004 owners) accept `offset` and `limit` query parameters. The frontend does not expose page controls (per those use cases' business rules), but the backend still needs a concrete default: `limit` defaults to 20 and is capped at 100 server-side, regardless of what the client requests.

### 2.3. Application Layer (Serverless Backend)
- **Execution:** Each API endpoint is backed by **AWS Lambda**. An ASGI adapter (such as `Mangum`) is used to wrap the entire **FastAPI** application and allow it to run in Lambda's ephemeral environment.
- **Data Validation:** At this layer, **Pydantic** strictly enforces the API contract (types, required fields, regex patterns such as the 10-digit telephone in UC-003/UC-006), automatically rejecting malformed requests before they reach the business logic.
- **Business Rule Layer:** Cross-record rules that Pydantic cannot express — duplicate pet name per owner (UC-007/UC-008 BR-001), owner/pet ownership consistency (UC-009 BR-003), birth date not in the future (UC-007/UC-008 BR-002) — live in a service/domain layer between the FastAPI routers and the SQLAlchemy models, not in the Pydantic schemas and not inline in the routers. Routers stay thin: parse/validate the request (Pydantic), delegate to the service layer, map the result or raised domain exception to an HTTP response.
- **Performance and Latency Strategy (Cold Starts):** Since there are no critical latency requirements in the initial phase, the architecture accepts the baseline AWS Lambda cold start time to optimize costs.

### 2.4. Persistence and Database Layer
- **ORM:** The business model communicates with the database through **SQLAlchemy**. Database engine connections are initialized at the global level (outside the main Lambda handler) to reuse TCP connections within a warm execution environment.
- **Storage:** **Amazon Aurora Serverless v2 (PostgreSQL)** provides robust Postgres compatibility with Serverless agility. It scales its compute capacity instantly according to traffic and scales down to a minimum during idle periods. It is deployed inside a VPC (Virtual Private Cloud) in private subnets, making it inaccessible directly from the internet.
- **Connection Management (Lambda concurrency vs. Postgres `max_connections`):** Each concurrent Lambda execution environment holds its own connection, so concurrency is bounded to stay within Aurora's connection limit rather than left uncapped: the Lambda function's *reserved concurrency* is capped at **20**, matching the concurrent-user capacity target (requirements.md NFR-012 — this is a single clinic's staff roster, not a public-facing app), and `db_max_capacity` must be sized to provide at least 20 usable connections. The SQLAlchemy engine uses a small pool (`pool_size=1`, `NullPool` is also acceptable given one connection per warm environment) instead of a large in-process pool. This keeps the initial-phase cost at zero extra infrastructure. **RDS Proxy is the recommended upgrade path** if traffic grows enough that the concurrency cap becomes a throughput bottleneck — it is deliberately deferred rather than included from day one, consistent with this document's stated cost-optimization goal.
- **Case Sensitivity and Collation:** Business rules differ by use case and must be implemented deliberately, not left to whatever the default collation happens to do:
  - UC-004 BR-001 requires a **case-sensitive** "starts with" match on owner last name — this is Postgres's default `LIKE` behavior, so no special handling is needed (`WHERE last_name LIKE :prefix || '%'`).
  - UC-007/UC-008 BR-001 require **case-insensitive** duplicate pet name detection within an owner — this does not happen by default in Postgres and must be implemented explicitly, either via a functional unique constraint (`UNIQUE (owner_id, LOWER(name))`) or the `citext` extension on the `name` column. A plain `UNIQUE (owner_id, name)` constraint would be case-sensitive and would silently violate the business rule.
- **Backup and Retention:** Aurora's automated backups and point-in-time recovery are enabled in every environment, with a **7-day** retention window in `dev` and a **14-day** window in `prod` (requirements.md NFR-013), set via each environment's `input.yaml`; no additional backup tooling is required for this scope.
- **Schema Migrations (Alembic):** Table creation and every schema change are managed as version-controlled Alembic migrations living alongside the SQLAlchemy models, not applied ad hoc. Because Aurora sits in private subnets with no public access, migrations cannot be run directly from a GitHub Actions runner; instead, a small dedicated **migration Lambda** (VPC-attached, packaged with the Alembic scripts) is invoked via `aws lambda invoke` as a deployment pipeline step immediately after `terraform apply`, and runs `alembic upgrade head` inside the VPC.
- **Reference Data Seeding:** Baseline lookup data required by the use cases — pet types (UC-007 precondition) and vet specialties — is inserted via Alembic **data migrations** in that same migration chain, so seed data is version-controlled and applied through the same mechanism as schema changes, in every environment, with no separate seeding tool or manual step.

### 2.5. Identity Provisioning (Clinic User Accounts)
- **Provisioning Mechanism:** Clinic User accounts (UC-011) are Terraform-managed `aws_cognito_user` resources, driven by a list of staff (name/email) declared in that environment's `input.yaml` (§5). Onboarding a new staff member during this phase is "add an entry to the list, `terraform apply`" — there is no self-service sign-up and no admin UI.
- **Initial Credentials:** Users are created with a temporary password and `FORCE_CHANGE_PASSWORD` status, so each Clinic User sets their own password on first login rather than the temporary one being usable long-term.
- **Deferred:** A self-service admin invite flow (a Clinic User inviting another without touching Terraform) is a plausible future iteration, not built now — it isn't required by any current use case and the Terraform-managed list is sufficient for a small prototype staff roster.

---

## 3. Network Topology and Security (AWS)

1. **Private VPC:** The database and the AWS Lambda functions that require access to it reside in private subnets within a VPC in AWS.
2. **Access Control (IAM):** - The Frontend is publicly accessible (read-only via CloudFront).
    - The API requires authentication (Cognito) for modification operations.
    - IAM roles are configured following the Principle of Least Privilege (e.g. Lambda functions only have permissions to read/write in Aurora and generate logs in CloudWatch).
3. **Secrets Management:** Database passwords and external API keys are stored encrypted in **AWS Secrets Manager**, injected securely into AWS Lambda at runtime.
4. **AWS WAF — Not Deployed (prototype phase):** No Web Application Firewall or other additional perimeter-hardening service sits in front of CloudFront/API Gateway at this time. The REST API Gateway choice (§2.2) keeps this a straightforward addition later; it is deliberately left out now to avoid extra services and cost while the app is still a prototype gathering feedback.

---

## 4. Development Lifecycle (CI/CD)

### 4.1. Infrastructure as Code (IaC)
All infrastructure is defined in **Terraform** files. This allows the environment to be replicated in seconds for isolated testing and avoids insecure manual configurations in the AWS web console.

- **Remote State Backend:** Terraform state is never local. Each environment stores its state in a versioned, encrypted **Amazon S3** bucket, with a **DynamoDB** table providing state locking so concurrent `plan`/`apply` runs (e.g., two CI runs, or CI plus a local run) cannot corrupt state or race each other. Without this, a stateless GitHub Actions runner would have no persisted state to diff against between runs.

### 4.2. Continuous Integration Pipeline (e.g. GitHub Actions)
To ensure application robustness without increasing operational costs, the deployment pipeline automates both static validation and a hybrid interface testing strategy:

- **AWS Authentication (prototype phase):** GitHub Actions authenticates to AWS using a long-lived IAM user access key/secret pair stored as encrypted GitHub Actions secrets, scoped to the minimum permissions the pipeline needs. This is a known temporary trade-off (§0) — OIDC federation (GitHub's OIDC provider assuming a short-lived IAM role, no stored credentials at all) is the intended follow-up, deferred for now to avoid extra setup time before the prototype ships.

1. **Static Validation:** Running `ruff check` and `mypy` to analyze style and type inconsistencies in Python, and `terraform validate` plus `tflint`/`checkov` to catch misconfigured or insecure infrastructure (e.g., a resource missing the mandated tags, or an over-permissioned IAM role) before it is ever applied.
2. **Unit and Integration Tests:** Running `pytest` to validate the logic of backend controllers and models.
3. **Interface and Hybrid Regression Tests (Frontend):**
    - **E2E Functional Tests (Playwright):** Verification of critical business flows to ensure that the interface logic and API respond correctly.
    - **Native Visual Regression (Zero Cost):** To avoid aesthetic failures and layout blind spots, Playwright's native visual assertions (`toHaveScreenshot`) will be used. Reference images will be stored in the repository. This blocks deployments if CSS misalignments or overlapping text occur without depending on paid external SaaS services.
4. **Clean Packaging (Dependency Management with `uv`):**
    - **`uv`** is used as the package manager for both local development and CI/CD, so environments stay identical. It enforces strict lockfiles (`uv.lock`) for full reproducibility, and makes CI/CD packaging significantly cleaner and faster.
    - Only production dependencies are installed (excluding development tools such as `pytest`, `mypy`, `ruff`).
    - The `boto3` and `botocore` libraries are explicitly excluded from the package, as the native AWS Lambda runtime environment includes them by default.
    - All test files (`tests/`), documentation (`docs/`, `*.md`), examples, and Python compilation caches (`__pycache__/`, `*.pyc`) are removed from the final artifact.
5. **Deployment:** Automated execution of `terraform apply` to update the infrastructure and code in AWS, followed by two post-apply steps:
   - **Migrations:** `aws lambda invoke` triggers the migration Lambda (§2.4), running `alembic upgrade head` (schema + seed data) against Aurora before the new application code starts receiving traffic.
   - **Canary Rollout:** The new Lambda version is published and shifted in behind a weighted alias (e.g., 10% of traffic for a short bake period, then 100%) rather than switching all traffic at once. **Rollback is currently manual** (redeploy the previous Lambda version/alias weight) — there is no CloudWatch-alarm-triggered automatic rollback, since no alerting is configured yet (§0, §6). The canary step still limits the blast radius of a bad deploy even without automated detection.

## 5. Configuration and Parameterization (Input Variables)

To guarantee the immutable infrastructure principle and facilitate exact environment replication (Development, Testing, Production), no IP addressing values, capacity sizing, or geographic zone assignments should be declared directly in code resources.

### 5.1. Global Infrastructure Variable Matrix (IaC)
The entire network and persistence topology is exposed through input variables whose actual values are managed externally, not hardcoded in resource blocks:

| Variable | Type | Description | Scope |
| :--- | :--- | :--- | :--- |
| `environment` | `string` | Environment prefix for resource names and tags. | Global |
| `aws_region` | `string` | Physical AWS region chosen for deployment. | Network / Compute |
| `vpc_cidr` | `string` | Primary CIDR block for VPC address space allocation. | Network (VPC) |
| `availability_zones` | `list(string)` | Explicit list of availability zones for subnets and high availability. | Network / Database |
| `db_min_capacity` | `number` | Minimum compute capacity units (ACUs) for Aurora Serverless. | Persistence |
| `db_max_capacity` | `number` | Maximum compute capacity units (ACUs) for Aurora Serverless. | Persistence |
| `db_backup_retention_days` | `number` | Automated backup/PITR retention window (7 in `dev`, 14 in `prod` — requirements.md NFR-013). | Persistence |
| `lambda_reserved_concurrency` | `number` | Max concurrent Lambda executions (20 — requirements.md NFR-012), bounding Aurora connections. | Compute / Persistence |
| `clinic_users` | `list(object)` | Initial Clinic User roster (name/email) for Terraform-managed Cognito accounts (§2.5). | Identity |

### 5.2. Per-Environment Configuration (`input.yaml`)
Specific values are not stored as HCL `.tfvars` files, but as a plain **`input.yaml`** file per environment, so the
configuration a non-Terraform reader (or an AI assistant) needs to understand an environment is a flat, readable
YAML document rather than HCL syntax:
- `terraform/environments/dev/input.yaml` (agile, low-cost development environment)
- `terraform/environments/prod/input.yaml` (production environment with multi-AZ high availability)

Each environment's root module reads its own file directly rather than requiring a `-var-file` flag on the CLI.

Resources then reference `local.input.<key>` (e.g., `local.input.db_max_capacity`). Because each environment's
`input.yaml` lives inside that environment's own directory, `terraform plan`/`apply` run there need no extra flags —
the correct file is always the one next to the config being run.

### 5.3. Cost Allocation Tagging Strategy
Serverless architectures can generate unexpected costs if resource consumption is not tracked. An `environment` prefix alone is insufficient. A strict tagging strategy must be enforced at the Terraform AWS provider level using `default_tags`, ensuring the following tags are automatically applied to **every** provisioned resource:

| Tag | Example Value | Purpose |
| :--- | :--- | :--- |
| `Environment` | `dev` / `prod` | Isolate costs per deployment environment. |
| `Project` | `VETOnline` | Attribute costs to this specific project. |
| `Owner` | `team-vetonline` | Identify the team responsible for the resource. |
| `ManagedBy` | `Terraform` | Indicate that the resource must not be modified manually. |

Enforcing tags at the provider level (rather than per-resource) guarantees no resource is ever deployed without cost attribution, enabling accurate billing breakdowns in AWS Cost Explorer.

---

## 6. Observability and Monitoring

Because serverless architectures are highly distributed and notoriously difficult to debug, strict observability practices must be followed:

- **Structured Logging:** Never use standard `print()` statements. Use structured JSON logging (e.g., `aws-lambda-powertools` or `structlog` in Python). This ensures all logs sent to CloudWatch can be easily filtered and queried using CloudWatch Logs Insights.
- **Correlation IDs:** Every incoming request must be tagged with a unique Trace/Correlation ID. This ID must be captured at the API Gateway level, injected into the logger's context, and passed along to downstream services (and database query logs) to trace the entire lifecycle of a single user action.
- **Distributed Tracing (AWS X-Ray):** AWS X-Ray must be enabled for API Gateway and Lambda. The FastAPI application, AWS SDK calls (`boto3`), and SQLAlchemy database transactions must be instrumented with the X-Ray SDK. This provides visual service maps and helps identify latency bottlenecks (like Cold Starts) and points of failure across the stack.
- **Frontend Telemetry:** The React application should capture API failures and attach the backend-generated Correlation ID to its own error reports. This bridges the gap between client-side crashes and backend logs.
- **No Automated Alerting (prototype phase):** Structured logs, correlation IDs, and X-Ray traces exist to support manual, retrospective debugging when a user or stakeholder reports a problem during this feedback phase — nothing here pages anyone. CloudWatch Alarms and SNS notifications are deliberately not configured, because there is no on-call/ops team to receive or act on them yet. This should be revisited once the prototype has a support model behind it; see §0.