import { expect, test } from '@playwright/test';
import { createOwnerViaUi, login, uniqueSuffix } from './helpers';

/** UC-007 Add Pet to Owner. Requires auth (BR-004) — every test logs in first, then creates a
 * fresh owner through the real Add Owner flow so each test's pet data starts from a clean,
 * collision-free owner regardless of what other (parallel) tests have created. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

// page.goto is a full reload, so AuthContext re-restores the session (fetchUserAttributes)
// before RequireAuth renders anything — wait for the real form, not the isLoading blank gap.
async function gotoAddPet(page: import('@playwright/test').Page, petsUrl: string) {
  await page.goto(petsUrl);
  await expect(page.getByRole('heading', { name: 'Add pet' })).toBeVisible();
}

test('main flow: valid data adds a pet and shows the confirmation banner', async ({ page }) => {
  const petsUrl = await createOwnerViaUi(page, `Coleman-${uniqueSuffix()}`);
  await gotoAddPet(page, petsUrl);

  await page.locator('#pet-name').fill('Basil');
  await page.locator('#birth-date').fill('2022-09-04');
  await page.locator('#pet-type').selectOption({ label: 'hamster' });
  await page.getByRole('button', { name: 'Add Pet' }).click();

  await expect(page.getByText('New Pet has been Added')).toBeVisible();
});

test('add pet form matches the design system baseline', async ({ page }) => {
  const petsUrl = await createOwnerViaUi(page, `Visualbaseline-${uniqueSuffix()}`);
  await gotoAddPet(page, petsUrl);
  // Wait for the pet-types fetch to populate the <select> so the baseline captures the
  // fully-loaded state, not the "Select a type…"-only placeholder mid-fetch.
  await expect(page.locator('#pet-type option')).toHaveCount(7);
  await expect(page).toHaveScreenshot('add-pet-empty.png');
});

test.describe('A1: duplicate pet name', () => {
  test('a case-insensitive name collision is rejected with "already exists"', async ({ page }) => {
    const petsUrl = await createOwnerViaUi(page, `Coleman-${uniqueSuffix()}`);

    await gotoAddPet(page, petsUrl);
    await page.locator('#pet-name').fill('Rex');
    await page.locator('#birth-date').fill('2020-01-01');
    await page.locator('#pet-type').selectOption({ label: 'dog' });
    await page.getByRole('button', { name: 'Add Pet' }).click();
    await expect(page.getByText('New Pet has been Added')).toBeVisible();

    await gotoAddPet(page, petsUrl);
    await page.locator('#pet-name').fill('rex'); // same name, different case
    await page.locator('#birth-date').fill('2021-01-01');
    await page.locator('#pet-type').selectOption({ label: 'dog' });
    await page.getByRole('button', { name: 'Add Pet' }).click();

    await expect(page.getByText('already exists')).toBeVisible();
    await expect(page.getByText('There was an error adding the pet.')).toBeVisible();
    await expect(page).toHaveScreenshot('add-pet-validation-error.png');
  });
});

test.describe('A2: birth date in the future', () => {
  test('shows the exact BR-002 message', async ({ page }) => {
    const petsUrl = await createOwnerViaUi(page, `Coleman-${uniqueSuffix()}`);
    await gotoAddPet(page, petsUrl);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('#pet-name').fill('Ghost');
    await page.locator('#birth-date').fill(tomorrow);
    await page.locator('#pet-type').selectOption({ label: 'cat' });
    await page.getByRole('button', { name: 'Add Pet' }).click();

    await expect(page.getByText('Birth date must not be in the future.')).toBeVisible();
  });
});

test.describe('A3: missing required fields', () => {
  test('submitting the empty form shows a required error per field', async ({ page }) => {
    const petsUrl = await createOwnerViaUi(page, `Coleman-${uniqueSuffix()}`);
    await gotoAddPet(page, petsUrl);

    await page.getByRole('button', { name: 'Add Pet' }).click();

    await expect(page.getByText('This field is required.')).toHaveCount(3);
  });
});

test.describe('owner not found', () => {
  test('submitting against a nonexistent owner shows the not-found error view', async ({ page }) => {
    await gotoAddPet(page, '/owners/999999/pets/new');
    await page.locator('#pet-name').fill('Ghost');
    await page.locator('#birth-date').fill('2020-01-01');
    await page.locator('#pet-type').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Add Pet' }).click();

    await expect(page).toHaveURL('/error');
    await expect(page.getByText("We couldn't find what you were looking for.")).toBeVisible();
  });
});
