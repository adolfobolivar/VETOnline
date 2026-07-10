# VETOnline

This repository's main goal is **not** the veterinary clinic app itself — it's an experiment in **spec-driven
software development**, testing the [AI Unified Process](https://unifiedprocess.ai/) methodology: write
specifications first (vision, use cases, entity model, architecture, testing strategy), then let AI assistants
implement the code against those specs, rather than writing code first and documenting after the fact.

VETOnline, a modernized serverless rebuild of the classic Spring PetClinic reference app, is the vehicle for that
experiment — see `docs/guidelines/vision.md` for what it actually is and who it's for.

## Project Structure

Two groups, on purpose: everything under **Specifications** is text written before any code, and read by both
humans and the Construction skills; everything under **Implementation** is either those skills or what they produce.

### Specifications

- `docs/guidelines/vision.md` — scope, actors, objectives, explicit non-goals.
- `docs/guidelines/requirements.md` — functional/non-functional requirements and constraints catalog.
- `docs/guidelines/entity_model.md` — ER diagram and attribute tables for every persisted entity.
- `docs/guidelines/use_cases.puml` — one-page PlantUML overview of actors and all 11 use cases.
- `docs/guidelines/architecture.md` — technical architecture and infrastructure decisions.
- `docs/guidelines/testing.md` — testing strategy and use-case-to-test traceability.
- `docs/guidelines/design-system.md` / `design-mockup.html` — the frontend's visual identity: color/type tokens,
  component patterns, and a working reference build you can open directly in a browser.
- `docs/use-cases/` — one spec per use case (UC-001 through UC-011): main flow, alternative flows, business rules.
- `CLAUDE.md` — instructions and conventions for AI assistants working in this repo.

### Implementation

- `aiup-fastapi-react/` — the Construction-phase plugin for this project's stack (FastAPI/React/Terraform): the
  skills that read the specs above and produce the code below. Built because no equivalent existed in the AIUP
  marketplace; see its own README for details.
- `backend/` *(not yet created)* — FastAPI + SQLAlchemy/Alembic, produced by `/implement-backend` and
  `/alembic-migration`.
- `frontend/` *(not yet created)* — React, produced by `/implement-frontend`, following `design-system.md`.
- `terraform/` *(not yet created)* — AWS infrastructure, produced by `/terraform-module`.

## Local Prerequisites (macOS)

Software needed on your Mac before you can build/run the app or deploy `terraform/` to AWS. Versions shown are what
was verified installed while writing this; treat them as a floor, not a ceiling.

| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Terraform** (>= 1.5) | Provision AWS infra in `terraform/` | ✅ installed (v1.15.8) |
| **AWS CLI v2** | Authenticate to AWS; invoke the migration Lambda post-`apply` | ✅ installed (2.35.19) — run `aws configure` (or an SSO profile) so `aws sts get-caller-identity` succeeds before any `terraform apply` |
| **tflint** | Terraform static analysis — a CI gate (architecture.md §4.2) | ✅ installed (0.63.1) |
| **checkov** | Terraform security/misconfiguration scanning — a CI gate | ✅ installed (3.3.0) |
| **uv** | Python package/dependency manager for `backend/` | ✅ installed (0.11.21) |
| **Python** (3.11+) | Backend runtime, managed by `uv` | ✅ installed (3.13.5) |
| **Node.js / npm** | `frontend/` build tooling | ✅ installed (Node v26.5.0 / npm 11.17.0) |
| **Docker** (optional) | Runs the HashiCorp Terraform MCP server (`aiup-fastapi-react/.mcp.json`) for AI-assisted infra work | only needed if using that MCP server |

Per-environment Terraform inputs live in `terraform/environments/<env>/`:
- `input.yaml` — non-sensitive sizing/topology/roster config (region, VPC CIDR, Aurora capacity, Lambda
  concurrency, Clinic User list); committed to the repo (architecture.md §5.2).
- `secrets.yaml` — local-only AWS credentials used to run Terraform from your machine; **gitignored**, never
  committed. Fill in your own values before running `terraform plan`/`apply`.

See `CLAUDE.md` for the actual build/run/test commands once prerequisites are in place.

## The Spec-Driven Process (How to Repeat This)

This section is the actual deliverable of the experiment: a general sequence for building software spec-first,
independent of this specific clinic app. Each step below is what we did in this repo, in order, with the artifact it
produced. Skip a step and the ones after it get noticeably harder — most of the "gaps" caught along the way were
found *because* the next step forced the previous one to be concrete.

1. **Vision** — one page answering: what is this, who is it for, what does it explicitly *not* do yet, and what's
   the delivery approach (e.g., prototype for feedback vs. hardened launch — that single decision cascades into
   almost every later trade-off). → `vision.md`.
2. **Requirements catalog** — split into three kinds, in three separate tables, never mixed:
   - *Functional* requirements as user stories ("As a [role], I want [goal] so that [benefit]"), one per use case.
   - *Non-functional* requirements — every one measurable (a number or a testable pass/fail), never a vague adjective
     like "fast" or "reliable." This is where SLAs, HA/uptime targets, concurrency/scalability ceilings, backup
     retention, and browser/device support get pinned down. If the honest answer is "not decided yet," say that
     explicitly as a stated, deliberate decision (with a reason) — don't leave it as silent absence.
   - *Constraints* — the boundaries that aren't quality attributes: fixed tech stack, budget, schedule, regulatory,
     or operational limits ("no on-call team yet," "long-lived credentials for now," etc.).
   → `requirements.md`.
3. **Entity model** — an ER diagram plus one attribute table per entity (name, type, length, validation rules),
   derived from the requirements and use cases. This is the step that turns "the code references an owner_id" prose
   into an actual, checkable schema — do this before any migration or ORM code exists. → `entity_model.md`.
4. **Use case diagram** — a one-page visual map of actors to use cases. Low effort, mainly useful for showing
   non-technical stakeholders scope at a glance rather than handing them a folder of markdown files. → `use_cases.puml`.
5. **Detailed use case specs** — one file per use case: main success scenario, every alternative/failure flow,
   pre/postconditions, and numbered business rules (`BR-xxx`). This is where most of the real detail lives, and
   every later document (architecture, tests) should cite these `BR-xxx` IDs rather than restate the rule. →
   `docs/use-cases/UC-001` … `UC-011`.
6. **Architecture** — the technical design that satisfies the requirements and constraints from step 2. Document
   deliberate trade-offs explicitly and up front (e.g., a "why this is temporary" section) so a shortcut reads as a
   conscious choice instead of something a future reader "fixes" by accident. → `architecture.md`.
7. **Testing strategy** — the test pyramid, fixture choices, and — critically — a traceability matrix mapping every
   use case (and its alternative flows, not just the happy path) to the test layer that covers it. "Done" means every
   row in that matrix is covered, not "the tests I happened to write pass." → `testing.md`.
8. **Adversarial review, repeated** — periodically ask for a "brutal honest" gap analysis of what exists so far
   against what's supposed to exist. Every finding gets resolved as an explicit decision — fixed, deferred with a
   reason, or rejected — never silently ignored. This is what surfaced the missing entity model, the missing auth
   use case, and the unmeasurable NFRs in this repo's own history.
9. **Construction tooling, before construction.** If a Construction-phase plugin doesn't already exist for your
   stack (check the AIUP marketplace first), build one before writing application code by hand — skills that read
   your own specs (entity model, use cases, architecture, testing strategy) and generate migrations,
   backend/frontend implementation, infrastructure, and tests, each with a stack-specific `DO NOT` list grounded in
   decisions your own docs already made. This repo's `aiup-fastapi-react/` is that plugin for FastAPI + React +
   Terraform/AWS. → `aiup-fastapi-react/`.
10. **Visual direction, before UI construction.** If the product has a frontend, a UI-implementation skill needs a
    visual specification the same way it needs a use case — a named color/type/component token system, not "make it
    look nice." Anchor it to a concrete reference if you have one, validate it with a working mockup (not just a
    written description) before building real screens against it, and wire both into the Construction skills'
    `Resources`/`DO NOT` lists so independently-built screens still look like one product. → `design-system.md`,
    `design-mockup.html`.
11. **Only then, implementation.** Code is written against the specs above, not the other way around. If a business
    rule isn't traceable to a `BR-xxx`, either the code or the spec is wrong — one of them has to change.

Steps 2–5 map directly to the `aiup-core` plugin's skills (`requirements`, `entity-model`, `use-case-diagram`,
`use-case-spec`); steps 1, 6, and 7 were produced through iterative brainstorming/critique rather than a dedicated
skill, since this marketplace's core plugin doesn't (yet) ship one for vision/architecture/testing docs specifically.
Step 9 mirrors the marketplace's own `aiup-vaadin-jooq` pattern, adapted to a new stack.

## References

Background material and prior art informing this experiment and the architecture decisions made within it:

- [AI Unified Process — methodology overview (video)](https://www.youtube.com/watch?v=35dH6q18UtI)
- [AI Unified Process marketplace](https://github.com/AI-Unified-Process/marketplace/blob/main/README.md) — source
  of the `aiup-core` plugin used in this repo (entity model, requirements, use-case-diagram, use-case-spec, and
  reverse-engineer skills).
- [When to move from SPA to SSR: a real-world dev decision](https://rakeshkadam.medium.com/when-to-move-from-spa-to-ssr-a-real-world-dev-decision-8663909ddfb4) —
  takeaway so far: SPA is fast, simple, and awesome; revisit only if the app's needs later point toward SSR.

## Notes / Lessons Learned

- **Frontend design:** anchor to a concrete reference, pull its real values (not a paraphrased impression), validate
  with a working mockup, then wire the tokens into the Construction skills so screens can't drift. →
  `design-system.md`, `design-mockup.html`.
- **Skill quality evaluation:** a `SKILL.md` that reads fine on review can still be missing what actually makes it
  usable — run it through [Tessl](https://tessl.io/registry/skills/github/adolfobolivar/VETOnline)'s automated
  evaluations rather than trusting a self-review. It caught two real gaps in `aiup-fastapi-react/`: an
  under-specified skill description (named one core verb instead of the concrete constructs it actually produces)
  and a skill with no executable template, prose-only where a copy-paste code skeleton was needed. →
  `aiup-fastapi-react/skills/`.
- **A folder of `SKILL.md` files isn't enough:** Claude Code only discovers skills that are either bundled in an
  installed plugin or placed in `.claude/skills/`. The fix is a local, non-hosted marketplace —
  `.claude-plugin/marketplace.json` plus `plugin.json`, with the marketplace's plugin `source` pointing at a
  relative path — no external repo or publishing required, same mechanism a GitHub-hosted marketplace uses. →
  `aiup-fastapi-react/.claude-plugin/`.
- **Terraform's remote state backend can't bootstrap itself:** Terraform resolves the `backend` block before any
  variables are evaluated, so the S3 bucket + DynamoDB lock table an environment depends on can't be created by
  that same environment's module, and can't read its bucket/table names from `input.yaml` either. `dev` and `prod`
  are also separate AWS accounts, so each needs its own small, local-state bootstrap module applied once by hand,
  before that environment's first `terraform init`. → `terraform/bootstrap/`.
- **An infrastructure layer's dependencies aren't always other infrastructure:** Aurora depending on the network
  layer's VPC is the obvious kind of dependency, spotted from reading architecture.md alone. The application layer's
  Lambda depending on `backend/app` existing at all (an `/implement-backend` artifact, not a Terraform output) — and
  on that package being built for Lambda's actual runtime platform, not the laptop running `terraform apply`,
  since compiled dependencies like `psycopg[binary]` ship platform-specific wheels — is the kind that only surfaces
  once you actually try to build and run the thing. Both are now called out explicitly (architecture.md §2.3,
  `/terraform-module`'s "Application Layer Prerequisite") so the next pass doesn't rediscover them the hard way. →
  `terraform/modules/application/`.