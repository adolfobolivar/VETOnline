import { expect, test } from '@playwright/test';
import { createOwnerWithPetViaUi, login, uniqueSuffix } from './helpers';

/** UC-008 Update Pet. Requires auth (BR-004) — every test logs in first, then creates a fresh
 * owner + pet through the real UI so each test edits its own collision-free pet. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function gotoEditPet(page: import('@playwright/test').Page, ownerId: string, petId: string) {
  await page.goto(`/owners/${ownerId}/pets/${petId}/edit`);
  // page.goto is a full reload, so AuthContext re-restores the session before RequireAuth
  // renders anything — wait for the real (pre-filled) form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: 'Edit pet' })).toBeVisible();
}

test('main flow: valid changes update the pet and show the confirmation banner', async ({ page }) => {
  const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
  await gotoEditPet(page, ownerId, petId);

  await page.locator('#pet-name').fill('Max');
  await page.locator('#pet-type').selectOption({ label: 'lizard' });
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(page).toHaveURL(`/owners/${ownerId}`);
  await expect(page.getByText('Pet details has been edited')).toBeVisible();
  await expect(page.getByText('Max')).toBeVisible();
  await expect(page.getByText(/lizard/)).toBeVisible();
});

test('edit pet form matches the design system baseline, pre-filled including type', async ({ page }) => {
  const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
  await gotoEditPet(page, ownerId, petId);
  // Confirms the pet-type reverse lookup (owner-detail's resolved type name -> pet_type_id)
  // resolved before the screenshot, not just that the <select> has options.
  await expect(page.locator('#pet-type')).toHaveValue(/\d+/);
  await expect(page).toHaveScreenshot('edit-pet-prefilled.png');
});

test.describe('A1: duplicate pet name', () => {
  test('a case-insensitive collision against a different pet is rejected with "already exists"', async ({
    page,
  }) => {
    const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');

    // A second pet for the same owner, to collide with.
    await page.goto(`/owners/${ownerId}/pets/new`);
    await page.locator('#pet-name').fill('Basil');
    await page.locator('#birth-date').fill('2021-01-01');
    await page.locator('#pet-type').selectOption({ label: 'hamster' });
    await page.getByRole('button', { name: 'Add Pet' }).click();
    await expect(page.getByText('New Pet has been Added')).toBeVisible();

    await gotoEditPet(page, ownerId, petId);
    await page.locator('#pet-name').fill('basil'); // same name as the other pet, different case
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('already exists')).toBeVisible();
    await expect(page.getByText('There was an error updating the pet.')).toBeVisible();
    // Blurred so the field's blinking text cursor doesn't produce a flaky pixel diff between
    // the baseline capture and a later comparison run.
    await page.locator('#pet-name').blur();
    await expect(page).toHaveScreenshot('edit-pet-validation-error.png');
  });

  test('keeping a pet\'s own name is not treated as a duplicate', async ({ page }) => {
    const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
    await gotoEditPet(page, ownerId, petId);

    await page.locator('#birth-date').fill('2021-06-01'); // change something, keep the same name
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page).toHaveURL(`/owners/${ownerId}`);
    await expect(page.getByText('Pet details has been edited')).toBeVisible();
  });
});

test.describe('A2: birth date in the future', () => {
  test('shows the exact BR-002 message', async ({ page }) => {
    const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
    await gotoEditPet(page, ownerId, petId);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('#birth-date').fill(tomorrow);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Birth date must not be in the future.')).toBeVisible();
  });
});

test.describe('A3: missing required field', () => {
  test('a blank name shows a required error', async ({ page }) => {
    const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
    await gotoEditPet(page, ownerId, petId);

    await page.locator('#pet-name').fill('');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('This field is required.')).toBeVisible();
  });
});
