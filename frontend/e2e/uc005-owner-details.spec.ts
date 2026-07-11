import { expect, test } from '@playwright/test';
import { createOwnerWithPetViaUi, login } from './helpers';

/** UC-005 View Owner Details. Requires auth (BR-003) — every test logs in first. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('main flow: owner info, pets (alphabetical), visits (chronological), and action links', async ({
  page,
}) => {
  // Fixed (non-unique-suffixed) last name: it's visible in the full-page screenshot below, and
  // a variable-length value would make every run's baseline comparison a false mismatch (the
  // same class of issue as the edit forms' pre-filled fields — see uc006's test comments).
  // Owner has no uniqueness constraint on name, so a fixed, reused value is safe here.
  const lastName = 'Zzdetailsvisualbaseline';
  const { ownerId, petId: whiskersId } = await createOwnerWithPetViaUi(page, lastName, 'Whiskers');

  // A second pet, added after the first, but alphabetically before it (BR-002 — display order
  // must not just reflect insertion order).
  await page.goto(`/owners/${ownerId}/pets/new`);
  await page.locator('#pet-name').fill('Basil');
  await page.locator('#birth-date').fill('2021-01-01');
  await page.locator('#pet-type').selectOption({ label: 'hamster' });
  await page.getByRole('button', { name: 'Add Pet' }).click();
  await expect(page.getByText('New Pet has been Added')).toBeVisible();

  // Two visits for Whiskers, booked out of chronological order (BR-001 — display order must
  // not just reflect insertion order either).
  await page.goto(`/owners/${ownerId}/pets/${whiskersId}/visits/new`);
  await page.locator('#visit-date').fill('2024-06-01');
  await page.locator('#description').fill('Later visit');
  await page.getByRole('button', { name: 'Book Visit' }).click();
  await expect(page.getByText('Your visit has been booked')).toBeVisible();

  await page.goto(`/owners/${ownerId}/pets/${whiskersId}/visits/new`);
  await page.locator('#visit-date').fill('2023-01-01');
  await page.locator('#description').fill('Earlier visit');
  await page.getByRole('button', { name: 'Book Visit' }).click();
  await expect(page.getByText('Your visit has been booked')).toBeVisible();

  await page.goto(`/owners/${ownerId}`);
  await expect(page.getByRole('heading', { name: `E2E ${lastName}` })).toBeVisible();
  await expect(page.getByText('1 E2E Test Way, Testville')).toBeVisible();
  await expect(page.getByText('5555550100')).toBeVisible();

  // BR-002: pets alphabetical, regardless of creation order.
  const petNames = page.locator('.pet-name');
  await expect(petNames).toHaveCount(2);
  await expect(petNames.nth(0)).toHaveText('Basil');
  await expect(petNames.nth(1)).toHaveText('Whiskers');

  // BR-001: visits chronological ascending, regardless of entry order.
  const visitDates = page.locator('.visit-date');
  await expect(visitDates).toHaveCount(2);
  await expect(visitDates.nth(0)).toHaveText('01/01/2023');
  await expect(visitDates.nth(1)).toHaveText('06/01/2024');

  // Step 4: action links to UC-006/007/008/009.
  await expect(page.getByRole('link', { name: 'Edit Owner' })).toHaveAttribute(
    'href',
    `/owners/${ownerId}/edit`,
  );
  await expect(page.getByRole('link', { name: 'Add New Pet' })).toHaveAttribute(
    'href',
    `/owners/${ownerId}/pets/new`,
  );
  await expect(page.getByRole('link', { name: 'Edit Pet' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add Visit' }).first()).toBeVisible();

  // Full-page: the viewport alone crops out the second pet card and its visit list, which is
  // the whole point of this baseline (the pet-card + visit-list pattern together).
  await expect(page).toHaveScreenshot('owner-details-populated.png', { fullPage: true });
});

test.describe('A1: owner not found', () => {
  test('shows the not-found error view', async ({ page }) => {
    await page.goto('/owners/999999999');

    await expect(page).toHaveURL('/error');
    await expect(page.getByText("We couldn't find what you were looking for.")).toBeVisible();
  });
});
