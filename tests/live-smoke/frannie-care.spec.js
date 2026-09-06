import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function safeName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
}

async function verificationShot(page, testInfo, checkpoint) {
  const dir = path.join(process.cwd(), 'verification-artifacts', safeName(testInfo.project.name));
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${safeName(checkpoint)}.png`), fullPage: true });
}

async function dismissSplash(page) {
  const begin = page.getByRole('button', { name: 'Let’s begin' });
  if (await begin.isVisible().catch(() => false)) {
    await begin.click();
  }
}

async function openApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/frannie/i);
  await dismissSplash(page);
  await expect(page.getByRole('heading', { name: /Frannie’s profile/i })).toBeVisible();
}

async function openBottomNav(page, name) {
  await page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
}

function collectBrowserFailures(page) {
  const browserErrors = [];
  const requestFailures = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => {
    const url = request.url();
    if (/google-analytics|googletagmanager|favicon/i.test(url)) return;
    requestFailures.push(`${request.method()} ${url} :: ${request.failure()?.errorText || 'failed'}`);
  });
  return { browserErrors, requestFailures };
}

test('startup and primary navigation work', async ({ page }, testInfo) => {
  const failures = collectBrowserFailures(page);
  await openApp(page);
  await verificationShot(page, testInfo, 'home');

  await page.getByRole('button', { name: 'View Frannie’s Care' }).click();
  await expect(page.getByRole('heading', { name: 'Frannie Care' })).toBeVisible();
  await verificationShot(page, testInfo, 'care');

  await openBottomNav(page, 'Frannie Log');
  await expect(page.getByRole('heading', { name: 'Frannie Log' })).toBeVisible();
  await verificationShot(page, testInfo, 'log');

  await openBottomNav(page, 'Home');
  await expect(page.getByRole('heading', { name: /Frannie’s profile/i })).toBeVisible();

  expect(failures.browserErrors, `Uncaught browser errors: ${failures.browserErrors.join('\n')}`).toEqual([]);
  expect(failures.requestFailures, `Unexpected request failures: ${failures.requestFailures.join('\n')}`).toEqual([]);
});

test('care records save and survive reload on an unpaired device', async ({ page }, testInfo) => {
  const failures = collectBrowserFailures(page);
  await openApp(page);

  await page.getByRole('button', { name: 'View Frannie’s Care' }).click();
  await expect(page.getByRole('heading', { name: 'Frannie Care' })).toBeVisible();

  const stamp = Date.now().toString().slice(-6);
  const medication = `Smoke Test Medication ${stamp}`;
  const food = `Smoke Test Food ${stamp}`;
  const caution = `Smoke Test Caution ${stamp}`;

  await page.locator('#treatmentType').selectOption({ label: 'Medication' });
  await page.locator('#treatmentName').fill(medication);
  await page.locator('#treatmentNote').fill('Automated local persistence check');
  await page.locator('#treatmentActive').check();
  await page.locator('#treatmentSaveBtn').click();
  await expect(page.locator('#treatmentList')).toContainText(medication);

  await page.locator('#foodCategory').selectOption({ label: 'Main meal' });
  await page.locator('#foodBrand').fill(food);
  await page.locator('#foodAmount').fill('1 test cup');
  await page.locator('#foodSchedule').fill('morning and evening');
  await page.locator('#foodActive').check();
  await page.locator('#feedingSaveBtn').click();
  await expect(page.locator('#feedingList')).toContainText(food);

  await page.locator('#allergyText').fill(caution);
  await page.locator('#allergySaveBtn').click();
  await expect(page.locator('#allergyList')).toContainText(caution);

  await verificationShot(page, testInfo, 'care-records-saved');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissSplash(page);
  await page.getByRole('button', { name: 'View Frannie’s Care' }).click();

  await expect(page.locator('#treatmentList')).toContainText(medication);
  await expect(page.locator('#feedingList')).toContainText(food);
  await expect(page.locator('#allergyList')).toContainText(caution);
  await verificationShot(page, testInfo, 'care-records-after-reload');

  expect(failures.browserErrors, `Uncaught browser errors: ${failures.browserErrors.join('\n')}`).toEqual([]);
  expect(failures.requestFailures, `Unexpected request failures: ${failures.requestFailures.join('\n')}`).toEqual([]);
});

test('Frannie Log quick note persists across reload', async ({ page }, testInfo) => {
  const failures = collectBrowserFailures(page);
  await openApp(page);

  await openBottomNav(page, 'Frannie Log');
  await expect(page.getByRole('heading', { name: 'Frannie Log' })).toBeVisible();

  const stamp = Date.now().toString().slice(-6);
  const title = `Smoke Test Note ${stamp}`;
  const note = `Automated Frannie Log persistence check ${stamp}`;

  await page.locator('#quickLogTitle').fill(title);
  await page.locator('#quickLogText').fill(note);
  await page.getByRole('button', { name: 'Add to Frannie Log' }).click();
  await expect(page.locator('#quickLogSaved')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissSplash(page);
  await openBottomNav(page, 'Frannie Log');
  await page.getByText('Frannie Log history').click();
  await expect(page.locator('#mainLogList')).toContainText(title);
  await expect(page.locator('#mainLogList')).toContainText(note);
  await verificationShot(page, testInfo, 'log-after-reload');

  expect(failures.browserErrors, `Uncaught browser errors: ${failures.browserErrors.join('\n')}`).toEqual([]);
  expect(failures.requestFailures, `Unexpected request failures: ${failures.requestFailures.join('\n')}`).toEqual([]);
});
