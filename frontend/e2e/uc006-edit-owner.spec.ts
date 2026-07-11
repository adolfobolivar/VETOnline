import { expect, test } from '@playwright/test';
import { createOwnerId, login, uniqueSuffix } from './helpers';

/** UC-006 Update Owner. Requires auth (BR-003) — every test logs in first, then creates a
 * fresh owner through the real Add Owner flow so each test edits its own collision-free
 * record. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function gotoEditOwner(page: import('@playwright/test').Page, ownerId: string) {
  await page.goto(`/owners/${ownerId}/edit`);
  // page.goto is a full reload, so AuthContext re-restores the session before RequireAuth
  // renders anything — wait for the real (pre-filled) form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Edit owner' })).toBeVisible();
}

test('main flow: valid changes update the owner and show the confirmation banner', async ({ page }) => {
  const ownerId = await createOwnerId(page, `Franklin-${uniqueSuffix()}`);
  await gotoEditOwner(page, ownerId);

  await page.locator('#city').fill('Sun Prairie');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(page).toHaveURL(`/owners/${ownerId}`);
  await expect(page.getByText('Owner Values Updated')).toBeVisible();
  await expect(page.getByText('1 E2E Test Way, Sun Prairie')).toBeVisible();
});

test('edit owner form matches the design system baseline', async ({ page }) => {
  // Fixed (non-unique-suffixed) data: the pre-filled last name is visible in the screenshot,
  // so a variable-length value would make every run's baseline comparison a false mismatch.
  // Owner has no uniqueness constraint on name, so a fixed, reused value is safe here.
  const ownerId = await createOwnerId(page, 'Visualbaseline');
  await gotoEditOwner(page, ownerId);
  await expect(page).toHaveScreenshot('edit-owner-prefilled.png');
});

test.describe('A1: validation errors', () => {
  test('blank mandatory fields show field errors and the form-level alert', async ({ page }) => {
    const ownerId = await createOwnerId(page, 'Visualbaseline');
    await gotoEditOwner(page, ownerId);

    await page.locator('#fname').clear();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('There was an error in updating the owner.')).toBeVisible();
    await expect(page.getByText('This field is required.')).toBeVisible();
    await expect(page.getByText('Owner Values Updated')).not.toBeVisible();
    await expect(page).toHaveScreenshot('edit-owner-validation-error.png');
  });

  test('malformed telephone shows the exact BR-002 message', async ({ page }) => {
    const ownerId = await createOwnerId(page, `Franklin-${uniqueSuffix()}`);
    await gotoEditOwner(page, ownerId);

    await page.locator('#tel').fill('123');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Telephone must be exactly 10 digits.')).toBeVisible();
    await expect(page.getByText('There was an error in updating the owner.')).toBeVisible();
  });
});
