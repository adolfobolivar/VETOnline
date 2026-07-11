import { expect, type Page } from '@playwright/test';

/** E2E_TEST_USERNAME/PASSWORD come from .env.test (loaded by playwright.config.ts) — a
 * dedicated, non-staff Cognito account (terraform/modules/cognito/e2e_test_user.tf), never
 * real clinic-staff credentials (testing.md §5). */
export async function login(page: Page, redirectTo = '/owners'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username or email').fill(process.env.E2E_TEST_USERNAME!);
  await page.getByLabel('Password').fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(redirectTo);
}

/** A fresh, collision-free owner for tests that need one already created (e.g. UC-007 pet
 * tests) without asserting anything about the Add Owner flow itself — goes through the real
 * UI rather than calling the API directly, since this is an E2E suite, not an API test.
 * UC-003 step 6 navigates to the new owner's Owner Details view (UC-005) on success, so the id
 * is read off that URL rather than a link that no longer exists on this page. */
export async function createOwnerViaUi(page: Page, lastName: string): Promise<string> {
  await page.goto('/owners/new');
  await page.locator('#fname').fill('E2E');
  await page.locator('#lname').fill(lastName);
  await page.locator('#addr').fill('1 E2E Test Way');
  await page.locator('#city').fill('Testville');
  await page.locator('#tel').fill('5555550100');
  await page.getByRole('button', { name: 'Add Owner' }).click();
  await expect(page.getByText('New Owner Created')).toBeVisible();
  await expect(page).toHaveURL(/\/owners\/\d+$/);
  const match = new URL(page.url()).pathname.match(/^\/owners\/(\d+)$/);
  if (!match) {
    throw new Error(`Expected to land on /owners/{id} after creating an owner, got ${page.url()}`);
  }
  return `/owners/${match[1]}/pets/new`;
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
