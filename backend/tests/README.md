# Backend Test Suite

Implementation-level index of what each test in `backend/tests/` actually checks. This lives
next to the tests (not in `docs/guidelines/`) because it tracks the current state of the code,
not the testing strategy — see `docs/guidelines/testing.md` for the strategy, fixture rationale,
and the use-case-level traceability matrix. Update this file's tables when tests are added,
renamed, or removed; run `uv run pytest --collect-only -q` to see the current, authoritative list
if this ever drifts.

Fixture setup (shared Postgres testcontainer, per-test truncation, lazy `app.main` import) is
documented in `conftest.py`'s own docstrings, not repeated here.

## Unit tests (`tests/unit/`) — 24 tests, no database

### `test_owner_schemas.py` — `OwnerCreate` (UC-003/UC-006)

| Test | Checks |
| :--- | :--- |
| `test_accepts_valid_owner` | A fully valid payload constructs without error |
| `test_rejects_blank_mandatory_field` (parametrized: `first_name`, `last_name`, `address`, `city`, `telephone`) | Each mandatory field rejects an empty string (BR-001) |
| `test_rejects_malformed_telephone` (parametrized: too short, too long, contains dashes, contains a letter) | Telephone must match `\d{10}` exactly (BR-002) |
| `test_create_schema_has_no_id_field` | The create schema has no client-settable `id` (BR-003 — server-assigned) |

### `test_pet_schemas.py` — `PetCreate` / `PetUpdate` (UC-007/UC-008)

| Test | Checks |
| :--- | :--- |
| `test_pet_create_accepts_valid_data` | Valid payload constructs without error |
| `test_pet_create_rejects_blank_name` | Name is mandatory |
| `test_pet_create_requires_pet_type_id` | Type is mandatory on create (BR-003) |
| `test_pet_create_requires_birth_date` | Birth date is mandatory |
| `test_pet_update_allows_omitted_pet_type_id` | Type may be omitted on update, defaulting to `None` (BR-003) |
| `test_pet_update_rejects_blank_name` | Name is still mandatory on update |

### `test_visit_schemas.py` — `VisitCreate` (UC-009)

| Test | Checks |
| :--- | :--- |
| `test_visit_defaults_to_todays_date_when_omitted` | `visit_date` defaults to today when not supplied (BR-002) |
| `test_visit_accepts_explicit_date` | An explicit date overrides the default |
| `test_visit_rejects_blank_description` | Description can't be an empty string (BR-001) |
| `test_visit_requires_description` | Description can't be omitted entirely (BR-001) |

### `test_pagination.py` — `pagination_params` (UC-002/UC-004, shared)

| Test | Checks |
| :--- | :--- |
| `test_defaults_to_offset_zero_limit_twenty` | Default offset/limit values |
| `test_limit_above_cap_is_silently_clamped_to_100` | A client-requested `limit=500` is clamped, not rejected |
| `test_limit_within_cap_passes_through` | A `limit`/`offset` under the cap pass through unchanged |

## Integration tests (`tests/integration/`) — 48 tests, against a real Postgres container

### `test_owners_api.py` — UC-003, UC-004, UC-005, UC-006

| Test | Checks |
| :--- | :--- |
| `test_create_owner_main_flow` | `POST /owners` main flow |
| `test_create_owner_assigns_server_side_id` | Two created owners get distinct, server-assigned ids (BR-003) |
| `test_create_owner_rejects_blank_mandatory_field` | A1 — blank field rejected with 422 |
| `test_create_owner_rejects_malformed_telephone` | A1 — bad telephone rejected with 422 |
| `test_search_owners_prefix_match` | `GET /owners?last_name=` "starts with" match |
| `test_search_owners_prefix_match_is_case_sensitive` | BR-001 — lowercase prefix does not match a capitalized last name |
| `test_search_owners_empty_last_name_returns_all` | A1 — empty search returns every owner (BR-003) |
| `test_search_owners_no_match_returns_empty_list` | A3 — no match returns `[]` |
| `test_search_owners_exactly_one_match` | A2 — exactly one result when only one owner matches |
| `test_search_owners_includes_pets` | Search results embed each owner's pets |
| `test_search_owners_pagination_respects_limit` | BR-002 — `limit` bounds the result count |
| `test_search_owners_pagination_offset` | BR-002 — `offset` pages through results |
| `test_get_owner_detail_main_flow` | `GET /owners/{id}` main flow |
| `test_get_owner_detail_not_found` | A1 — unknown id returns 404 |
| `test_get_owner_detail_pets_ordered_alphabetically` | BR-002 — pets returned alphabetically by name |
| `test_get_owner_detail_visits_ordered_chronologically` | BR-001 — visits returned in ascending date order; also checks the resolved `pet_type` name |
| `test_update_owner_main_flow` | `PUT /owners/{id}` main flow, persisted change verified via a follow-up GET |
| `test_update_owner_rejects_blank_mandatory_field` | A1 — blank field rejected with 422 |
| `test_update_owner_rejects_malformed_telephone` | A1 — bad telephone rejected with 422 |
| `test_update_owner_not_found` | Unknown id returns 404 |

### `test_pets_api.py` — UC-007, UC-008

| Test | Checks |
| :--- | :--- |
| `test_add_pet_main_flow` | `POST /owners/{id}/pets` main flow |
| `test_add_pet_duplicate_name_case_insensitive` | A1/BR-001 — `"rex"` collides with an existing `"Rex"`, returns 400 `{"field": "name", "error": "already exists"}` |
| `test_add_pet_same_name_allowed_for_different_owners` | The duplicate-name rule is scoped per owner, not global |
| `test_add_pet_future_birth_date` | A2/BR-002 — a birth date after today returns 422 on `birth_date` |
| `test_add_pet_missing_required_fields` | A3 — missing `name` and `pet_type_id` both flagged in one 422 |
| `test_add_pet_owner_not_found` | Unknown owner id returns 404 |
| `test_update_pet_main_flow` | `PUT /owners/{id}/pets/{id}` main flow |
| `test_update_pet_omitted_type_keeps_current_value` | BR-003 — omitting `pet_type_id` on update leaves the existing type untouched |
| `test_update_pet_can_keep_its_own_name` | Re-submitting a pet's own current name is not treated as a duplicate |
| `test_update_pet_duplicate_name_against_different_pet` | A1/BR-001 — colliding with a *different* pet's name is still rejected |
| `test_update_pet_future_birth_date` | A2/BR-002 |
| `test_update_pet_missing_required_field` | A3 |
| `test_update_pet_not_found` | Unknown pet id returns 404 |
| `test_update_pet_belonging_to_different_owner_is_not_found` | A pet id that exists but belongs to a different owner is treated as not found, not as a cross-owner edit |

### `test_visits_api.py` — UC-009

| Test | Checks |
| :--- | :--- |
| `test_add_visit_main_flow` | `POST /owners/{id}/pets/{id}/visits` main flow |
| `test_add_visit_defaults_to_todays_date` | BR-002 — omitted `visit_date` defaults server-side to today |
| `test_add_visit_missing_description` | A1/BR-001 — blank description returns 422 |
| `test_add_visit_pet_not_owned_by_given_owner` | A2/BR-003 — pet exists but under a different owner, returns 404 |
| `test_add_visit_pet_not_found` | Unknown pet id returns 404 |
| `test_add_visit_owner_not_found` | A3 — unknown owner id returns 404 |

### `test_veterinarians_api.py` — UC-002

| Test | Checks |
| :--- | :--- |
| `test_list_veterinarians_main_flow` | `GET /veterinarians` main flow |
| `test_vet_with_no_specialties_returns_empty_list` | A vet with no specialties returns `[]` (frontend renders this as "none") |
| `test_specialties_ordered_alphabetically` | BR-002 — specialties inserted out of order come back alphabetical |
| `test_veterinarians_ordered_by_last_name_then_first_name` | Result ordering |
| `test_veterinarians_pagination_respects_limit` | BR-001 — `limit` bounds the result count |
| `test_veterinarians_pagination_offset` | BR-001 — `offset` pages through results |

### `test_pet_types_api.py` — UC-007 precondition

| Test | Checks |
| :--- | :--- |
| `test_returns_seeded_pet_types_alphabetically` | `GET /pet-types` returns the Alembic-seeded reference data, alphabetically ordered |

### `test_demo_api.py` — UC-010

| Test | Checks |
| :--- | :--- |
| `test_oups_returns_sanitized_server_error` | BR-005 — `/oups` raises on purpose; BR-003 — the response is a sanitized 500 with no stack trace or file path leaked |
