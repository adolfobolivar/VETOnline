# E2E Test Suite (Playwright)

Implementation-level index of what each Playwright test actually checks. This lives next to the
tests (not in `docs/guidelines/`) because it tracks the current state of the code, not the
testing strategy — see `docs/guidelines/testing.md` §5 for the E2E strategy, visual-regression
workflow, and browser scope. Update this file's tables when tests are added, renamed, or removed.

## Setup

- `.env.test` (gitignored) holds the dedicated E2E Cognito test account's credentials
  (`E2E_TEST_USERNAME` / `E2E_TEST_PASSWORD`) plus the same dev-stack values as
  `.env.development`. Regenerate the password with:
  `cd terraform/environments/dev && ./with-creds.sh terraform output -raw e2e_test_password`
  (see `terraform/modules/cognito/e2e_test_user.tf` — never real clinic-staff credentials).
- `npm run e2e` runs the suite headless; `npm run e2e:update-snapshots` regenerates visual
  baselines (review the diff before committing — a baseline that doesn't match
  `docs/guidelines/design-system.md` is a defect, not a passing test).
- These tests run against the **real deployed dev API/Cognito/Aurora**, not a local mock — they
  write real rows (owners/pets, tagged with an `E2E-`/timestamp-suffixed last name for
  recognizability). There is no separate E2E environment in this prototype phase
  (architecture.md §0).

## `uc011-login.spec.ts` — UC-011 Clinic User Login, plus UC-010's auth boundary

| Test | Checks |
| :--- | :--- |
| `UC-011 main flow > valid credentials sign in and land on the default authenticated screen` | Main flow: real Cognito sign-in via the UI, nav shows "Signed in as {email}" |
| `UC-011 main flow > login screen matches the design system baseline` | Visual baseline: empty login form |
| `UC-011 A1 > shows the exact error text and stays on the login form` | A1: wrong password shows "Incorrect username or password.", stays on `/login`; visual baseline for the error state |
| `UC-011 A3 > clears the session and returns to the welcome page` | A3: logout clears the session, redirects to `/`, nav reverts to "Login" |
| `UC-010 A3 / UC-011 BR-003 > redirects to login without ever reaching the protected screen` | Visiting a protected route with no session at all redirects client-side (`RequireAuth`) before any API call |
| `UC-010 A3 / UC-011 BR-003 > logging in after the redirect resumes the originally intended destination` | BR-004 (UC-010) / UC-011 step 6 override: login redirects back to the page that triggered it, not the default landing screen |
| `UC-011 A2 (step 4) / UC-010 A3 > a 401 from a protected API call redirects to login, preserving the destination` | A2 step 4: a 401 from a protected endpoint (simulated via route interception, standing in for an expired/invalid JWT) redirects to login. The step 3 "silent refresh succeeds, retries transparently" sub-case needs a genuinely expired-but-refreshable access token (~1 hour) and isn't independently exercised — see the test's own comment. |

## `uc003-add-owner.spec.ts` — UC-003 Register New Owner

| Test | Checks |
| :--- | :--- |
| `main flow: valid data creates an owner and shows the confirmation banner` | Main flow: step 6's navigation to the new owner's Owner Details view (UC-005), with the banner shown there |
| `add owner form matches the design system baseline` | Visual baseline: empty form |
| `A1 > blank mandatory fields show field errors and the form-level alert` | A1/BR-001: four blank fields each show "This field is required.", plus the form-level alert; visual baseline for the error state |
| `A1 > malformed telephone shows the exact BR-002 message` | A1/BR-002: bad telephone shows "Telephone must be exactly 10 digits." |

## `uc004-find-owners.spec.ts` — UC-004 Find Owners by Last Name

| Test | Checks |
| :--- | :--- |
| `main flow: multiple matches render the owners list` | Main flow: two owners sharing a prefix both appear in `.owner-row`s with name/address/phone/pet-count |
| `find owners form matches the design system baseline` | Visual baseline: empty search form |
| `A1 > returns owners rather than a validation error` | A1/BR-003: an empty search returns results (at least one), not a validation error |
| `A2 > navigates directly to the Owner Details view` | A2: a search matching exactly one owner redirects straight to `/owners/{id}`, skipping the list |
| `A3 > attaches the "not found" error to the last-name field` | A3: a non-matching search shows "not found" on the field; visual baseline for the error state (fixed search term — see the test's own comment) |
| `BR-001: prefix match is case-sensitive` | BR-001: the same prefix in the wrong case does not match (Postgres's case-sensitive default `LIKE`) |
| `A4 > fetches and appends the next chunk as the sentinel scrolls into view` | A4/BR-002: 21 owners sharing a prefix force a second page; scrolling to the sentinel appends the 21st row. Slow (~45s: creates 21 owners through the real UI, since `PAGE_SIZE` is a fixed 20) — has its own extended `test.setTimeout`. |

## `uc005-owner-details.spec.ts` — UC-005 View Owner Details

| Test | Checks |
| :--- | :--- |
| `main flow: owner info, pets (alphabetical), visits (chronological), and action links` | Main flow end to end: owner fields, BR-002 (pets alphabetical regardless of creation order), BR-001 (visits chronological regardless of entry order), all four action links (Edit Owner/Add New Pet/Edit Pet/Add Visit); full-page visual baseline (fixed owner name — see the test's own comment) |
| `A1 > shows the not-found error view` | A1: a nonexistent owner id resolves to the not-found error view |

## `uc007-add-pet.spec.ts` — UC-007 Add Pet to Owner

| Test | Checks |
| :--- | :--- |
| `main flow: valid data adds a pet and shows the confirmation banner` | Main flow, via a freshly-created owner (`createOwnerViaUi` helper) |
| `add pet form matches the design system baseline` | Visual baseline: empty form, waited for the pet-type `<select>` to finish loading its real options |
| `A1 > a case-insensitive name collision is rejected with "already exists"` | A1/BR-001: `"Rex"` then `"rex"` for the same owner is rejected; visual baseline for the error state |
| `A2 > shows the exact BR-002 message` | A2/BR-002: a birth date of tomorrow shows "Birth date must not be in the future." |
| `A3 > submitting the empty form shows a required error per field` | A3: three required-field errors on an empty submit |
| `owner not found > submitting against a nonexistent owner shows the not-found error view` | Submitting against a nonexistent owner id navigates to the `/error` not-found variant |

## `uc006-edit-owner.spec.ts` — UC-006 Update Owner

| Test | Checks |
| :--- | :--- |
| `main flow: valid changes update the owner and show the confirmation banner` | Main flow: pre-filled form, edited field persists, "Owner Values Updated" banner on Owner Details |
| `edit owner form matches the design system baseline` | Visual baseline: pre-filled form (fixed, non-unique-suffixed owner data — see the test's own comment on why) |
| `A1 > blank mandatory fields show field errors and the form-level alert` | A1/BR-001: clearing a pre-filled field shows "This field is required." plus the form-level alert; visual baseline for the error state |
| `A1 > malformed telephone shows the exact BR-002 message` | A1/BR-002: bad telephone shows "Telephone must be exactly 10 digits." |

## `uc008-edit-pet.spec.ts` — UC-008 Update Pet

| Test | Checks |
| :--- | :--- |
| `main flow: valid changes update the pet and show the confirmation banner` | Main flow: pre-filled form (including the type `<select>`, resolved from the owner-detail response's type *name* back to an id — see `EditPetPage.tsx`), edits persist, "Pet details has been edited" banner |
| `edit pet form matches the design system baseline, pre-filled including type` | Visual baseline: pre-filled form, asserts the type `<select>` actually resolved to a real option before capturing |
| `A1 > a case-insensitive collision against a different pet is rejected with "already exists"` | A1/BR-001: renaming one pet to collide (case-insensitively) with a second pet under the same owner is rejected; visual baseline for the error state |
| `A1 > keeping a pet's own name is not treated as a duplicate` | BR-001's exclusion: a pet keeping its own current name while other fields change is not flagged as a duplicate |
| `A2 > shows the exact BR-002 message` | A2/BR-002: a birth date of tomorrow shows "Birth date must not be in the future." |
| `A3 > a blank name shows a required error` | A3: clearing the name shows "This field is required." |

## `uc009-add-visit.spec.ts` — UC-009 Book Visit for Pet

| Test | Checks |
| :--- | :--- |
| `main flow: valid data books a visit and shows the confirmation banner` | Main flow: BR-002 default-to-today date, visit persists, "Your visit has been booked" banner, new visit visible on Owner Details |
| `add visit form matches the design system baseline` | Visual baseline: empty form (date field masked — see below) |
| `previous visits are shown for context on a second visit` | Main-flow step 2: a pet's existing visits are listed for context when booking another |
| `A1 > shows a required error` | A1/BR-001: blank description shows "This field is required."; visual baseline for the error state (date field masked) |
| `A2 > pet not owned by the given owner > shows the not-found error view` | A2/BR-003: a pet id that belongs to a *different* owner resolves to the not-found error view |
| `A3 > owner not found > shows the not-found error view` | A3: a nonexistent owner id resolves to the not-found error view |

Both `uc009` visual baselines mask the `#visit-date` field (`toHaveScreenshot(..., { mask: [...] })`) — it defaults to today's date (BR-002), which is different every day the suite runs, so an unmasked baseline would drift out of date on its own.

## A note on flakiness found while writing UC-006/008/009's tests

Both `uc006` and `uc008` intermittently submitted the pre-filled (unedited) form data instead of
the test's actual edit, roughly half the time, in a way that looked at first like a Playwright/
React input-timing race. It turned out to be a real bug: `EditOwnerPage.tsx`/`EditPetPage.tsx`'s
data-fetching `useEffect` had no guard against React `<StrictMode>`'s dev-mode double-invocation,
so a second, redundant fetch could resolve *after* the test had already started editing the
pre-filled form and silently overwrite it. Fixed with a `cancelled` flag in the effect's cleanup
— see `architecture.md` §2.1 for the general pattern, since it applies to any future page with the
same fetch-then-pre-fill shape, not just these two.
