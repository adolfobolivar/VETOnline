import { expect, test } from '@playwright/test';
import { createOwnerId, login, uniqueSuffix } from './helpers';

/** UC-004 Find Owners by Last Name. Requires auth (BR-004) — every test logs in first. Owners
 * are created through the real Add Owner UI with unique, prefixed last names so each test's
 * search only ever matches records it created itself, regardless of what other (parallel)
 * tests or prior runs have left in the shared dev database. */

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function gotoFindOwners(page: import('@playwright/test').Page) {
  await page.goto('/owners');
  await expect(page.getByRole('heading', { name: 'Find owners' })).toBeVisible();
}

test('main flow: multiple matches render the owners list', async ({ page }) => {
  const prefix = `Zzsearch${uniqueSuffix()}`;
  await createOwnerId(page, `${prefix}-A`);
  await createOwnerId(page, `${prefix}-B`);

  await gotoFindOwners(page);
  await page.locator('#lastname').fill(prefix);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.locator('.owner-row')).toHaveCount(2);
  await expect(page.getByText(`E2E ${prefix}-A`)).toBeVisible();
  await expect(page.getByText(`E2E ${prefix}-B`)).toBeVisible();
  await expect(page.getByText('1 E2E Test Way, Testville')).toHaveCount(2);
  await expect(page.getByText('0 pets')).toHaveCount(2);
});

test('find owners form matches the design system baseline', async ({ page }) => {
  await gotoFindOwners(page);
  await expect(page).toHaveScreenshot('find-owners-empty.png');
});

test.describe('A1: empty last-name search', () => {
  test('returns owners rather than a validation error', async ({ page }) => {
    // BR-003: the point of this scenario is that an empty search is treated as the broadest
    // possible search, not that it returns literally every owner ever created in the shared
    // dev database — asserting "at least one result, no not-found error" is what's specific to
    // A1 without over-coupling the test to unrelated data from other runs.
    await createOwnerId(page, `Zzempty${uniqueSuffix()}`);

    await gotoFindOwners(page);
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.locator('.owner-row').first()).toBeVisible();
    await expect(page.getByText('not found')).not.toBeVisible();
  });
});

test.describe('A2: exactly one match', () => {
  test('navigates directly to the Owner Details view', async ({ page }) => {
    const lastName = `Zzunique${uniqueSuffix()}`;
    const ownerId = await createOwnerId(page, lastName);

    await gotoFindOwners(page);
    await page.locator('#lastname').fill(lastName);
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(`/owners/${ownerId}`);
    await expect(page.getByRole('heading', { name: `E2E ${lastName}` })).toBeVisible();
  });
});

test.describe('A3: no match', () => {
  test('attaches the "not found" error to the last-name field', async ({ page }) => {
    await gotoFindOwners(page);
    // Fixed (non-unique-suffixed) search term: it's visible in the screenshot below, and a
    // variable-length value would make every run's baseline comparison a false mismatch (the
    // same class of issue as the edit forms' pre-filled fields — see uc006's test comments).
    await page.locator('#lastname').fill('Zzzguaranteednomatch');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText('not found')).toBeVisible();
    await expect(page).toHaveScreenshot('find-owners-not-found.png');
  });
});

test('BR-001: prefix match is case-sensitive', async ({ page }) => {
  const lastName = `Zzcase${uniqueSuffix()}`;
  await createOwnerId(page, lastName);

  await gotoFindOwners(page);
  // Same prefix, wrong case — BR-001 uses Postgres's case-sensitive default LIKE, so this
  // must not match the owner just created (which would otherwise land on A2's single-match
  // redirect instead of A3's not-found state).
  await page.locator('#lastname').fill(lastName.toLowerCase());
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText('not found')).toBeVisible();
});

test.describe('A4: scroll through results', () => {
  test('fetches and appends the next chunk as the sentinel scrolls into view', async ({ page }) => {
    // Creating 21 owners through the real UI (one at a time, since PAGE_SIZE is a fixed 20)
    // comfortably exceeds Playwright's default 30s per-test timeout.
    test.setTimeout(120_000);
    const prefix = `Zzpage${uniqueSuffix()}`;
    // PAGE_SIZE is a fixed 20 in FindOwnersPage — 21 owners is the minimum needed to force a
    // second page (BR-002's "no fixed page size" is about the UI, not this fetch chunk size).
    for (let i = 0; i < 21; i++) {
      await createOwnerId(page, `${prefix}-${String(i).padStart(2, '0')}`);
    }

    await gotoFindOwners(page);
    await page.locator('#lastname').fill(prefix);
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.locator('.owner-row')).toHaveCount(20);
    await expect(page.getByText('Loading more owners')).toBeVisible();

    await page.locator('.load-more-row').scrollIntoViewIfNeeded();
    await expect(page.locator('.owner-row')).toHaveCount(21);
    await expect(page.getByText('Loading more owners')).not.toBeVisible();
  });
});
