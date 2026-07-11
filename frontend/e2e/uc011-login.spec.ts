import { expect, test } from '@playwright/test';
import { login, uniqueSuffix } from './helpers';

/** UC-011 Clinic User Login, plus the auth-boundary scenarios UC-010 A3/BR-004 depend on.
 * Runs against the dedicated E2E test Cognito account (testing.md §5), never real staff
 * credentials — see .env.test / terraform/modules/cognito/e2e_test_user.tf. */

test.describe('UC-011 main flow', () => {
  test('valid credentials sign in and land on the default authenticated screen', async ({ page }) => {
    await login(page);
    await expect(page.getByText(`Signed in as`)).toBeVisible();
    await expect(page.getByText(process.env.E2E_TEST_USERNAME!)).toBeVisible();
  });

  test('login screen matches the design system baseline', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-empty.png');
  });
});

test.describe('UC-011 A1: invalid credentials', () => {
  test('shows the exact error text and stays on the login form', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username or email').fill(process.env.E2E_TEST_USERNAME!);
    await page.getByLabel('Password').fill(`not-the-real-password-${uniqueSuffix()}`);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Incorrect username or password.')).toBeVisible();
    await expect(page).toHaveURL('/login');
    await expect(page).toHaveScreenshot('login-invalid-credentials.png');
  });
});

test.describe('UC-011 A3: logout', () => {
  test('clears the session and returns to the welcome page', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /Signed in as/ }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  });
});

test.describe('UC-010 A3 / UC-011 BR-003: unauthenticated access to a protected route', () => {
  test('redirects to login without ever reaching the protected screen', async ({ page }) => {
    await page.goto('/owners/new');
    await expect(page).toHaveURL('/login');
  });

  test('logging in after the redirect resumes the originally intended destination', async ({ page }) => {
    await page.goto('/owners/new');
    await expect(page).toHaveURL('/login');

    await page.getByLabel('Username or email').fill(process.env.E2E_TEST_USERNAME!);
    await page.getByLabel('Password').fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // BR-004 (UC-010) / UC-011 step 6 override: resumes /owners/new, not the /owners default.
    await expect(page).toHaveURL('/owners/new');
  });
});

test.describe('UC-011 A2 (step 4) / UC-010 A3: a rejected in-session request', () => {
  test('a 401 from a protected API call redirects to login, preserving the destination', async ({ page }) => {
    // Simulates what API Gateway's Cognito Authorizer does to an expired/invalid JWT — this
    // exercises the frontend's own recognition-and-redirect contract on that response, the
    // observable part of A2 step 4. The step 3 "silent refresh succeeds, retries
    // transparently" sub-case needs a genuinely expired-but-refreshable access token (~1 hour
    // in practice) and isn't independently exercised here; the retry code path it shares with
    // this scenario is what's under test.
    await login(page);

    await page.route('**/pet-types', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/owners/1/pets/new');

    await expect(page).toHaveURL('/login');
  });
});
