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
| `main flow: valid data creates an owner and shows the confirmation banner` | Main flow, including the "Add a pet for {first_name}" follow-up link |
| `add owner form matches the design system baseline` | Visual baseline: empty form |
| `A1 > blank mandatory fields show field errors and the form-level alert` | A1/BR-001: four blank fields each show "This field is required.", plus the form-level alert; visual baseline for the error state |
| `A1 > malformed telephone shows the exact BR-002 message` | A1/BR-002: bad telephone shows "Telephone must be exactly 10 digits." |

## `uc007-add-pet.spec.ts` — UC-007 Add Pet to Owner

| Test | Checks |
| :--- | :--- |
| `main flow: valid data adds a pet and shows the confirmation banner` | Main flow, via a freshly-created owner (`createOwnerViaUi` helper) |
| `add pet form matches the design system baseline` | Visual baseline: empty form, waited for the pet-type `<select>` to finish loading its real options |
| `A1 > a case-insensitive name collision is rejected with "already exists"` | A1/BR-001: `"Rex"` then `"rex"` for the same owner is rejected; visual baseline for the error state |
| `A2 > shows the exact BR-002 message` | A2/BR-002: a birth date of tomorrow shows "Birth date must not be in the future." |
| `A3 > submitting the empty form shows a required error per field` | A3: three required-field errors on an empty submit |
| `owner not found > submitting against a nonexistent owner shows the not-found error view` | Submitting against a nonexistent owner id navigates to the `/error` not-found variant |
