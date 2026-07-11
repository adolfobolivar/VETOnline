import { expect, test } from '@playwright/test';
import { createOwnerId, createOwnerWithPetViaUi, login, uniqueSuffix } from './helpers';

/** UC-009 Book Visit for Pet. Requires auth (BR-004) — every test logs in first, then creates
 * a fresh owner + pet through the real UI so each test books its own collision-free visit. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function gotoAddVisit(
  page: import('@playwright/test').Page,
  ownerId: string,
  petId: string,
  petName: string,
) {
  await page.goto(`/owners/${ownerId}/pets/${petId}/visits/new`);
  // page.goto is a full reload, so AuthContext re-restores the session before RequireAuth
  // renders anything — wait for the real form, not the isLoading blank gap.
  await expect(page.getByRole('heading', { name: `Add visit for ${petName}` })).toBeVisible();
}

test('main flow: valid data books a visit and shows the confirmation banner', async ({ page }) => {
  const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
  await gotoAddVisit(page, ownerId, petId, 'Rex');

  // BR-002: the date field is pre-populated with today's date.
  const today = new Date().toISOString().slice(0, 10);
  await expect(page.locator('#visit-date')).toHaveValue(today);

  await page.locator('#description').fill('Annual checkup, rabies shot administered');
  await page.getByRole('button', { name: 'Book Visit' }).click();

  await expect(page).toHaveURL(`/owners/${ownerId}`);
  await expect(page.getByText('Your visit has been booked')).toBeVisible();
  await expect(page.getByText('Annual checkup, rabies shot administered')).toBeVisible();
});

test('add visit form matches the design system baseline', async ({ page }) => {
  const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
  await gotoAddVisit(page, ownerId, petId, 'Rex');
  // The date field defaults to today (BR-002), which is different every day the suite runs —
  // masked so the baseline doesn't drift out of date on its own.
  await expect(page).toHaveScreenshot('add-visit-empty.png', {
    mask: [page.locator('#visit-date')],
  });
});

test('previous visits are shown for context on a second visit', async ({ page }) => {
  const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
  await gotoAddVisit(page, ownerId, petId, 'Rex');
  await page.locator('#description').fill('First visit');
  await page.getByRole('button', { name: 'Book Visit' }).click();
  await expect(page.getByText('Your visit has been booked')).toBeVisible();

  await gotoAddVisit(page, ownerId, petId, 'Rex');
  await expect(page.getByText('Previous visits')).toBeVisible();
  await expect(page.getByText('First visit')).toBeVisible();
});

test.describe('A1: missing description', () => {
  test('shows a required error', async ({ page }) => {
    const { ownerId, petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
    await gotoAddVisit(page, ownerId, petId, 'Rex');

    await page.getByRole('button', { name: 'Book Visit' }).click();

    await expect(page.getByText('This field is required.')).toBeVisible();
    await expect(page).toHaveScreenshot('add-visit-validation-error.png', {
      mask: [page.locator('#visit-date')],
    });
  });
});

test.describe('A2: pet not owned by the given owner', () => {
  test('shows the not-found error view', async ({ page }) => {
    const { petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');
    const otherOwnerId = await createOwnerId(page, `Davis-${uniqueSuffix()}`);

    await page.goto(`/owners/${otherOwnerId}/pets/${petId}/visits/new`);

    await expect(page).toHaveURL('/error');
    await expect(page.getByText("We couldn't find what you were looking for.")).toBeVisible();
  });
});

test.describe('A3: owner not found', () => {
  test('shows the not-found error view', async ({ page }) => {
    const { petId } = await createOwnerWithPetViaUi(page, `Coleman-${uniqueSuffix()}`, 'Rex');

    await page.goto(`/owners/999999/pets/${petId}/visits/new`);

    await expect(page).toHaveURL('/error');
    await expect(page.getByText("We couldn't find what you were looking for.")).toBeVisible();
  });
});
