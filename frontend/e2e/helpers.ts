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

/** A fresh, collision-free owner for tests that need one already created, without asserting
 * anything about the Add Owner flow itself — goes through the real UI rather than calling the
 * API directly, since this is an E2E suite, not an API test. UC-003 step 6 navigates to the new
 * owner's Owner Details view (UC-005) on success, so the id is read off that URL. */
export async function createOwnerId(page: Page, lastName: string): Promise<string> {
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
  return match[1];
}

/** Same as `createOwnerId`, but returns the Add Pet form's URL directly — the shape UC-007
 * tests want. */
export async function createOwnerViaUi(page: Page, lastName: string): Promise<string> {
  const ownerId = await createOwnerId(page, lastName);
  return `/owners/${ownerId}/pets/new`;
}

/** Owner + one pet, both freshly created through the real UI, for tests that need an existing
 * pet to edit or book a visit against (UC-008/UC-009). The pet's id isn't surfaced anywhere in
 * the Owner Details response the page renders from directly, so it's read off the resulting
 * "Edit Pet" link's href rather than parsed out of a network response. */
export async function createOwnerWithPetViaUi(
  page: Page,
  lastName: string,
  petName: string,
): Promise<{ ownerId: string; petId: string }> {
  const ownerId = await createOwnerId(page, lastName);

  await page.goto(`/owners/${ownerId}/pets/new`);
  await expect(page.getByRole('heading', { name: 'Add pet' })).toBeVisible();
  await page.locator('#pet-name').fill(petName);
  await page.locator('#birth-date').fill('2020-01-01');
  await page.locator('#pet-type').selectOption({ label: 'dog' });
  await page.getByRole('button', { name: 'Add Pet' }).click();
  await expect(page.getByText('New Pet has been Added')).toBeVisible();
  await expect(page).toHaveURL(`/owners/${ownerId}`);

  const editLink = page.getByRole('link', { name: 'Edit Pet' });
  const href = await editLink.getAttribute('href');
  const petIdMatch = href?.match(/^\/owners\/\d+\/pets\/(\d+)\/edit$/);
  if (!petIdMatch) {
    throw new Error(`Expected an "Edit Pet" link with a pet id, got ${href}`);
  }
  return { ownerId, petId: petIdMatch[1] };
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
