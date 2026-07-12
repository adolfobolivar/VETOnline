# Progress

A running status snapshot of this project, maintained by whichever AI coding tool is working in this repo — not by
hand. See the note at the bottom for how that's supposed to work.

This is a status tracker, unlike `docs/guidelines/*.md` (which are strategy/decision documents and deliberately
don't track implementation status — see `CLAUDE.md`). If you're looking for *why* something is built a certain way,
that's `architecture.md`/`testing.md`/the use case specs; this file only answers *is it built yet*.

## Specifications (Steps 1–7 of README's "Spec-Driven Process")

- [x] Vision (`docs/guidelines/vision.md`)
- [x] Requirements catalog (`docs/guidelines/requirements.md`)
- [x] Entity model (`docs/guidelines/entity_model.md`)
- [x] Use case diagram (`docs/guidelines/use_cases.puml`)
- [x] Detailed use case specs, UC-001 – UC-011 (`docs/use-cases/`)
- [x] Architecture (`docs/guidelines/architecture.md`)
- [x] Testing strategy (`docs/guidelines/testing.md`)
- [x] Design system + reference mockup (`docs/guidelines/design-system.md`, `design-mockup.html`)
- [x] Construction-phase plugin for this stack (`aiup-fastapi-react/`)

## Infrastructure (Terraform, `terraform/modules/`)

- [x] Bootstrap (remote state S3 bucket + DynamoDB lock table)
- [x] Network (VPC, subnets)
- [x] Aurora (Postgres, Serverless v2)
- [x] Cognito (user pool, Clinic User provisioning, E2E test account)
- [x] Application (Lambda + API Gateway, Cognito Authorizer)
- [x] Migration Lambda (`alembic upgrade head`, deployed as a pipeline step)
- [x] Frontend hosting (S3 + CloudFront, OAC, SPA error mapping)
- [x] CORS scoped to the deployed CloudFront domain (Lambda env var + API Gateway gateway responses)
- [x] `dev` environment applied and verified live (frontend, API, auth all checked in a real browser)
- [ ] `prod` environment (not yet provisioned)
- [ ] Custom domain + ACM certificate (deferred — see `architecture.md` §0's NFR-003 TLS gap)
- [ ] CI/CD pipeline (deferred — see `architecture.md` §0; all applies so far are manual)

## Use Cases

Backend/Frontend columns track whether the implementation exists. Test columns track whether that layer has
*dedicated* coverage per `testing.md` §7's expected layers for that use case — a blank cell means that layer isn't
expected for this UC, `[ ]` means it's expected but missing.

| UC | Name | Backend | Frontend | Unit | Integration | E2E |
| :-- | :--- | :-: | :-: | :-: | :-: | :-: |
| 001 | View Welcome Page | — | [x] | — | — | [ ] |
| 002 | View Veterinarians | [x] | [x] | [x] | [x] | [ ] |
| 003 | Register New Owner | [x] | [x] | [x] | [x] | [x] |
| 004 | Find Owners by Last Name | [x] | [x] | [x] | [x] | [x] |
| 005 | View Owner Details | [x] | [x] | — | [x] | [x] |
| 006 | Update Owner | [x] | [x] | [x] | [x] | [x] |
| 007 | Add Pet to Owner | [x] | [x] | [x] | [x] | [x] |
| 008 | Update Pet | [x] | [x] | [x] | [x] | [x] |
| 009 | Book Visit for Pet | [x] | [x] | [x] | [x] | [x] |
| 010 | View Application Error | [x] | [x] | — | [x] | [~] partial — only BR-004 (unauthorized recovery), covered incidentally inside `uc011-login.spec.ts`. BR-001/002/003/005 (anonymous access, nav shell, no stack trace leak, `/oups` route itself) have no dedicated test. |
| 011 | Clinic User Login | — | [x] | — | — | [x] |

**Known gaps** (the `[ ]`/`[~]` cells above): UC-001 and UC-002 have no E2E/visual-regression coverage at all despite
`testing.md` §7 calling for it; UC-010 is only partially covered. None of these block anything currently deployed —
they're test-coverage debt, not broken behavior.

## Suggested Next Steps

1. Close the UC-001/UC-002/UC-010 E2E gaps above (`/playwright-test`).
2. Decide whether `prod` gets provisioned now or stays deferred until the prototype earns further investment
   (`vision.md`'s stated delivery approach).
3. Everything else in `architecture.md` §0's prototype-phase trade-off list (CI/CD, custom domain, alerting, WAF) —
   revisit as a batch once there's a concrete trigger (e.g., real users, a second developer) rather than piecemeal.

---

**Maintenance note:** `CLAUDE.md` instructs AI assistants to update this file as part of finishing a unit of work
(a new use case's backend/frontend/tests, a new Terraform module, closing one of the gaps above) — check the boxes
in the same PR/commit that does the work, not as a separate afterthought. If this file and the actual repo state
disagree, trust the repo and fix this file, not the other way around.
