import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const qaSuffix = Date.now().toString(36);
const qaId = `qa-test-vehicle-${qaSuffix}`;
const qaTitle = `QA Test Vehicle ${qaSuffix}`;
const qaReference = `QA-${qaSuffix.toUpperCase()}`;
const browser = await chromium.launch({ headless: true });
let checks = 0;
const failures = [];
async function check(name, action) {
  try { await action(); checks += 1; console.log(`✓ ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); console.error(`✗ ${name}\n  ${error.message}`); }
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const browserErrors = [];
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
page.on('pageerror', (error) => browserErrors.push(error.message));

await check('Owner dashboard loads at the unlinked /admin route', async () => {
  await page.goto(`${baseURL}/admin`);
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.getByText('Toyota Land Cruiser 300').first().waitFor();
  assert.equal(await page.locator('.site-header').count(), 0);
  await page.screenshot({ path: 'qa/qa-admin-dashboard-desktop.png', fullPage: true });
});
await check('Vehicle and auto-parts workspaces are separate', async () => {
  await page.getByRole('button', { name: /Vehicles/ }).click();
  await page.getByRole('heading', { name: 'Vehicles' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Add vehicle/i }).count(), 1);
  await page.getByRole('button', { name: /Auto Parts/ }).click();
  await page.getByRole('heading', { name: 'Auto Parts' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Add part/i }).count(), 1);
});
await check('Owner can create a draft vehicle without invented facts', async () => {
  await page.getByRole('button', { name: /Vehicles/ }).click();
  await page.getByRole('button', { name: /Add vehicle/i }).click();
  await page.getByLabel('Listing title').fill(qaTitle);
  await page.getByLabel('Listing ID').fill(qaId);
  await page.getByLabel('Reference').fill(qaReference);
  await page.getByLabel('Make').fill('QA');
  await page.getByLabel('Model').fill('Test Vehicle');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.getByText('Listing saved.').waitFor();
  await page.getByText(qaTitle).waitFor();
  assert.equal(await page.locator('article').filter({ hasText: qaTitle }).getByText('draft', { exact: true }).count(), 1);
});
await check('Draft is excluded from the public catalogue', async () => {
  const catalogue = await (await page.request.get(`${baseURL}/api/catalogue`)).json();
  assert.equal(catalogue.vehicles.some((vehicle) => vehicle.id === qaId), false);
});
await check('Images upload, reorder and select a new cover', async () => {
  await page.getByRole('button', { name: `Edit ${qaTitle}` }).click();
  const chooser = page.locator('.admin-image-empty input[type="file"]');
  await chooser.setInputFiles(['public/images/polo.jpg', 'public/images/cx5.jpg']);
  await page.getByText('2 images uploaded.').waitFor();
  const figures = page.locator('.admin-image-grid figure');
  assert.equal(await figures.count(), 2);
  const secondSource = await figures.nth(1).locator('img').getAttribute('src');
  await figures.nth(1).getByRole('button', { name: 'Move image left' }).click();
  assert.equal(await figures.nth(0).locator('img').getAttribute('src'), secondSource);
  assert.equal(await figures.nth(0).getByText('Cover').count(), 1);
});
await check('Owner can publish the draft to the live catalogue', async () => {
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByText('Listing published to the public website.').waitFor();
  const catalogue = await (await page.request.get(`${baseURL}/api/catalogue`)).json();
  assert.equal(catalogue.vehicles.some((vehicle) => vehicle.id === qaId), true);
});
await check('Archiving removes a listing from the public catalogue', async () => {
  await page.getByRole('button', { name: /Back to listings/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `Archive ${qaTitle}` }).click();
  await page.getByText('Listing archived.').waitFor();
  const catalogue = await (await page.request.get(`${baseURL}/api/catalogue`)).json();
  assert.equal(catalogue.vehicles.some((vehicle) => vehicle.id === qaId), false);
});
await check('Enquiry and order workflow views load', async () => {
  await page.locator('.admin-sidebar nav button').filter({ hasText: /^Enquiries/ }).click();
  await page.getByRole('heading', { name: /Customer enquiries/i }).waitFor();
  await page.locator('.admin-sidebar nav button').filter({ hasText: /^Orders/ }).click();
  await page.getByRole('heading', { name: /Order enquiries/i }).waitFor();
});
await check('Mobile admin navigation and page fit the viewport', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/admin`);
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.locator('.admin-mobile-header button').click();
  await page.locator('.admin-sidebar.open').waitFor();
  await page.locator('.admin-sidebar nav button').filter({ hasText: /^Vehicles/ }).click();
  await page.getByRole('heading', { name: 'Vehicles' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.locator('.admin-mobile-header button').click();
  await page.locator('.admin-sidebar.open').waitFor();
  await page.screenshot({ path: 'qa/qa-admin-vehicles-mobile.png', fullPage: true });
});
await check('Admin interaction creates no browser errors', async () => {
  assert.deepEqual(browserErrors, []);
});

await context.close();
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} of ${checks + failures.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks} admin checks passed.`);
