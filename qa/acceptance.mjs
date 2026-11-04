import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const failures = [];
const checks = [];

function pass(name, detail = '') {
  checks.push({ name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function assert(value, name, detail = '') {
  if (!value) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  pass(name, detail);
}
async function pageWithErrors(context) {
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
  page.on('console', (message) => message.type() === 'error' && failures.push(`Console error: ${message.text()}`));
  return page;
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await pageWithErrors(desktop);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());

  // Journey 1: Used car enquiry.
  await page.goto(`${baseURL}/used-cars`, { waitUntil: 'networkidle' });
  await page.getByLabel('Keyword').fill('Toyota');
  await page.getByLabel('Maximum price').fill('120000');
  assert(await page.locator('.vehicle-card').count() >= 1, 'Journey 1: Toyota search and price filter returns a vehicle');
  await page.locator('.vehicle-card h3 a').filter({ hasText: 'Land Cruiser' }).first().click();
  await page.waitForURL('**/vehicles/toyota-land-cruiser-300');
  await page.waitForFunction(() => document.querySelectorAll('.gallery-thumbnails button').length === 5);
  assert((await page.locator('.gallery-thumbnails button').count()) === 5, 'Journey 1: vehicle gallery exposes five supplied images');
  const initialImage = await page.locator('.gallery-main > img').getAttribute('src');
  await page.locator('.gallery-thumbnails button').nth(1).click();
  const changedImage = await page.locator('.gallery-main > img').getAttribute('src');
  assert(initialImage !== changedImage, 'Journey 1: gallery thumbnail changes the main image');
  const whatsAppHref = await page.getByRole('link', { name: 'Enquire on WhatsApp' }).getAttribute('href');
  assert(whatsAppHref.includes('Toyota%20Land%20Cruiser%20300') && whatsAppHref.includes('MOC-LC300-001'), 'Journey 1: WhatsApp message contains vehicle and reference');

  // Journey 2: New car discovery.
  await page.goto(`${baseURL}/new-cars`, { waitUntil: 'networkidle' });
  await page.getByLabel('Make').selectOption('Mazda');
  await page.getByLabel('Maximum price').fill('50000');
  assert((await page.locator('.vehicle-card').count()) === 1, 'Journey 2: new-car make and price filters work');
  await page.locator('.vehicle-card h3 a').click();
  await page.waitForURL('**/vehicles/mazda-cx5');
  await page.locator('h1').filter({ hasText: 'Mazda CX-5' }).waitFor();
  assert((await page.locator('h1').first().innerText()).includes('Mazda CX-5'), 'Journey 2: new vehicle detail opens');
  assert((await page.getByRole('link', { name: 'Enquire on WhatsApp' }).getAttribute('href')).includes('MOC-CX5-004'), 'Journey 2: contact action includes listing reference');

  // Journey 3: Auto-parts order enquiry.
  await page.goto(`${baseURL}/auto-parts`, { waitUntil: 'networkidle' });
  await page.getByLabel('Search auto parts').fill('engine component');
  await page.getByLabel('Condition').selectOption('Used');
  assert((await page.locator('.part-card').count()) === 1, 'Journey 3: contextual part search and condition filter work');
  await page.locator('.part-card h3 a').click();
  await page.waitForURL('**/auto-parts/alternator-toyota-hilux');
  await page.locator('.part-quick-facts').waitFor();
  assert((await page.locator('.part-quick-facts').innerText()).includes('Toyota Hilux'), 'Journey 3: compatibility appears on product detail');
  await page.getByRole('button', { name: /Add to Cart/i }).click();
  await page.locator('a.cart-link').click();
  await page.waitForURL('**/cart');
  await page.locator('.cart-item').waitFor();
  assert((await page.locator('.cart-item').count()) === 1, 'Journey 3: part is added to cart');
  await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
  await page.waitForURL('**/checkout');
  await page.getByLabel('Full name').waitFor();
  await page.getByLabel('Full name').fill('Acceptance Test');
  await page.getByLabel('Phone number').fill('+263 700 000 000');
  await page.getByLabel('Email address').fill('acceptance@example.com');
  await page.getByLabel('Delivery address').fill('1 Test Street');
  await page.getByLabel('City').fill('Harare');
  await page.getByRole('button', { name: 'Submit Order Enquiry' }).click();
  await page.getByText('Order enquiry submitted').waitFor();
  assert((await page.locator('.reference-box strong').innerText()).startsWith('ORD-'), 'Journey 3: checkout reaches backend and returns a reference');

  await desktop.close();

  // Journey 4: Mobile experience.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await pageWithErrors(mobile);
  await mobilePage.goto(baseURL, { waitUntil: 'networkidle' });
  const homeOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(homeOverflow <= 1, 'Journey 4: homepage has no horizontal overflow');
  await mobilePage.getByRole('button', { name: 'Toggle navigation' }).click();
  await mobilePage.getByRole('link', { name: /Auto Parts/ }).first().click();
  await mobilePage.waitForURL('**/auto-parts');
  await mobilePage.getByLabel('Search auto parts').waitFor();
  await mobilePage.getByLabel('Search auto parts').fill('alternator');
  await mobilePage.locator('.part-card h3 a').click();
  await mobilePage.waitForURL('**/auto-parts/alternator-toyota-hilux');
  await mobilePage.getByRole('button', { name: /Add to Cart/i }).waitFor();
  await mobilePage.getByRole('button', { name: /Add to Cart/i }).click();
  assert((await mobilePage.locator('.cart-count').innerText()) === '1', 'Journey 4: mobile navigation, search, product page and cart work');
  const detailOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(detailOverflow <= 1, 'Journey 4: mobile product detail has no horizontal overflow');
  await mobile.close();

  assert(failures.length === 0, 'No browser console or page errors', failures.join('; '));
} catch (error) {
  failures.push(error.message);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nAcceptance test failed:');
  failures.forEach((failure) => console.error(`  • ${failure}`));
  process.exit(1);
}
console.log(`\n${checks.length} acceptance checks passed.`);
