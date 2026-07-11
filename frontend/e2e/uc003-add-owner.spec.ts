import { expect, test } from '@playwright/test';
import { login, uniqueSuffix } from './helpers';

/** UC-003 Register New Owner. Requires auth (BR-004) — every test logs in first. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('main flow: valid data creates an owner and shows the confirmation banner', async ({ page }) => {
  await page.goto('/owners/new');
  // page.goto is a full reload, so AuthContext re-restores the session (fetchUserAttributes)
  // before RequireAuth renders anything — wait for the real form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Add owner' })).toBeVisible();
  await page.locator('#fname').fill('George');
  await page.locator('#lname').fill(`Franklin-${uniqueSuffix()}`);
  await page.locator('#addr').fill('110 W. Liberty St.');
  await page.locator('#city').fill('Madison');
  await page.locator('#tel').fill('6085551023');
  await page.getByRole('button', { name: 'Add Owner' }).click();

  await expect(page.getByText('New Owner Created')).toBeVisible();
  await expect(page.getByRole('link', { name: /Add a pet for George/ })).toBeVisible();
});

test('add owner form matches the design system baseline', async ({ page }) => {
  await page.goto('/owners/new');
  // page.goto is a full reload, so AuthContext re-restores the session (fetchUserAttributes)
  // before RequireAuth renders anything — wait for the real form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Add owner' })).toBeVisible();
  await expect(page).toHaveScreenshot('add-owner-empty.png');
});

test.describe('A1: validation errors', () => {
  test('blank mandatory fields show field errors and the form-level alert', async ({ page }) => {
    await page.goto('/owners/new');
  // page.goto is a full reload, so AuthContext re-restores the session (fetchUserAttributes)
  // before RequireAuth renders anything — wait for the real form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Add owner' })).toBeVisible();
    await page.locator('#tel').fill('6085551023'); // isolate the blank-field case from the regex case
    await page.getByRole('button', { name: 'Add Owner' }).click();

    await expect(page.getByText('There was an error in creating the owner.')).toBeVisible();
    // BR-001: first name, last name, address, city all blank -> four field-level errors.
    await expect(page.getByText('This field is required.')).toHaveCount(4);
    await expect(page.getByText('New Owner Created')).not.toBeVisible();
    await expect(page).toHaveScreenshot('add-owner-validation-error.png');
  });

  test('malformed telephone shows the exact BR-002 message', async ({ page }) => {
    await page.goto('/owners/new');
  // page.goto is a full reload, so AuthContext re-restores the session (fetchUserAttributes)
  // before RequireAuth renders anything — wait for the real form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Add owner' })).toBeVisible();
    await page.locator('#fname').fill('George');
    await page.locator('#lname').fill(`Franklin-${uniqueSuffix()}`);
    await page.locator('#addr').fill('110 W. Liberty St.');
    await page.locator('#city').fill('Madison');
    await page.locator('#tel').fill('123');
    await page.getByRole('button', { name: 'Add Owner' }).click();

    await expect(page.getByText('Telephone must be exactly 10 digits.')).toBeVisible();
    await expect(page.getByText('There was an error in creating the owner.')).toBeVisible();
  });
});
