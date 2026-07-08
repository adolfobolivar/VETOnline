# Project Vision: VETOnline

VETOnline is an internal practice-management application for a single veterinary clinic. It is a modernized rebuild of
the classic Spring PetClinic reference application, re-architected onto a Python/React/AWS serverless stack, giving
clinic staff a reliable digital system to replace paper records and spreadsheets for tracking owners, pets, and visit
history.

## Target Audience

The system serves three groups directly, and one group indirectly:

**Visitors:** Anonymous users who can view the public welcome page and browse the clinic's veterinarian directory
without authenticating.

**Clinic Users:** Staff members and the system's primary users. They register new owners, search for existing ones,
manage pet records, and book visits.

**Pet Owners:** Individuals whose contact details and pets are recorded and maintained by Clinic Users. Owners do not
log in or interact with the system directly; they are the subject of the records Clinic Users maintain on their
behalf.

**Veterinarians:** Staff profiles listing name and specialties, maintained for display in the public directory.
Veterinarians do not have their own login or actions in this version of the system.

## Core Objectives

- **Replace manual record-keeping:** Give Clinic Users a single, reliable system of record for owner contact
  information, pet details, and visit history, eliminating paper files and spreadsheets.
- **Fast, accurate lookups:** Let Clinic Users find an owner and their pets in seconds via last-name search, rather
  than searching physical or disconnected records.
- **Public visibility of clinic expertise:** Let visitors browse the clinic's veterinarians and their specialties
  without needing an account.
- **Modernize the reference implementation:** Demonstrate a serverless, typed, test-covered rebuild of the original
  PetClinic application using FastAPI, React, and AWS managed services.

## Delivery Approach

The first release is a **working prototype**, built to get feedback from users and leadership before further
investment — not a hardened, fully production-ready launch. This deliberately shapes several architecture and
operations decisions (long-lived AWS credentials instead of OIDC, no automated alerting, no WAF, manual deploy
rollback); see `architecture.md` §0 for the specific trade-offs and what to revisit once the prototype earns further
investment.

## Explicitly Out of Scope

To keep this rebuild focused, the following are not goals of the current use cases and should not be assumed by
architecture or testing decisions unless a use case is added for them:

- Pet Owner or Veterinarian self-service accounts, logins, or portals.
- Online appointment requests initiated by owners.
- Messaging, reviews, or any community/social features between owners and the clinic.
- Multi-clinic or multi-tenant support — this is a single clinic's internal tool.

---

This scoping mirrors the use cases in `docs/use-cases/`: browsing the vet directory (UC-001, UC-002), and staff
managing owners, pets, and visits (UC-003 through UC-009), with a consistent error experience (UC-010).
