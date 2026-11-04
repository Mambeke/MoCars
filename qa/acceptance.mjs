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

  const header = page.locator('header');
  assert((await header.locator('img[alt="MoCars"]').getAttribute('src')) === '/images/mocars-swoosh-logo.png'
    && (await header.getByRole('button', { name: 'Inquire Now' }).count()) === 1
    && (await header.getByRole('button', { name: 'Search MoCars' }).count()) === 0
    && (await header.getByRole('link', { name: 'My account' }).count()) === 0
    && (await header.getByRole('link', { name: /Shopping cart/i }).count()) === 0,
  'Header uses the supplied logo and simplified inquiry action');
  const adminLink = page.locator('footer a.footer-admin-link');
  assert((await adminLink.textContent()) === 'Admin' && (await adminLink.getAttribute('href')) === '/admin',
    'Footer provides the secure Admin link');
  await header.getByRole('button', { name: 'Inquire Now' }).click();
  await page.getByLabel('Full name').fill('Acceptance Test');
  await page.getByLabel('Phone number').fill('+263 700 000 000');
  await page.getByLabel(/Email address/).fill('acceptance@example.com');
  await page.getByLabel('I am interested in').selectOption('vehicle');
  await page.getByRole('textbox', { name: 'How can we help?' }).fill('I would like help choosing a vehicle.');
  await page.getByRole('button', { name: 'Send Inquiry' }).click();
  await page.getByText('Inquiry submitted').waitFor();
  assert((await page.locator('.modal-panel .reference-box strong').innerText()).startsWith('ENQ-'), 'Header inquiry reaches the backend and returns a reference');
  await page.getByRole('button', { name: 'Done' }).click();
  const heroKicker = page.locator('.hero-kicker');
  const kickerBox = await heroKicker.boundingBox();
  const heroHeadingBox = await page.locator('.hero-content h1').boundingBox();
  assert((await heroKicker.textContent()) === 'Cars and Auto Parts in One Place'
    && kickerBox && heroHeadingBox && kickerBox.y + kickerBox.height <= heroHeadingBox.y,
  'Homepage places the cars-and-parts message above the hero statement');
  const featuredDesktop = await page.locator('.vehicle-featured-grid .vehicle-card').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  const featuredFollowsHero = await page.evaluate(() => document.querySelector('.facts-strip-wrap')?.nextElementSibling?.classList.contains('featured-vehicles-section'));
  assert(featuredFollowsHero && featuredDesktop.length === 4 && new Set(featuredDesktop).size === 1,
    'Featured vehicles appear directly below the hero in one row');
  const featuredParts = await page.evaluate(() => {
    const section = document.querySelector('.featured-parts-section');
    const vehicles = document.querySelector('.featured-vehicles-section');
    const cardTops = [...section.querySelectorAll('.part-card')].map((card) => Math.round(card.getBoundingClientRect().top));
    return {
      followsVehicles: vehicles?.nextElementSibling === section,
      title: section.querySelector('h2')?.textContent.trim(),
      cardCount: cardTops.length,
      oneRow: cardTops.length > 1 && new Set(cardTops).size === 1,
    };
  });
  assert(featuredParts.followsVehicles && featuredParts.title === 'Featured Auto Parts' && featuredParts.cardCount > 1,
    'Featured auto parts appear directly below featured vehicles');
  assert(featuredParts.oneRow, 'Featured auto parts appear inline in one row');
  const partImagesShowWholeProduct = await page.locator('.part-featured-grid .part-image img').evaluateAll((images) => images.length > 1 && images.every((image) => {
    const style = getComputedStyle(image);
    return image.complete && image.naturalWidth > 0 && Math.abs((image.naturalWidth / image.naturalHeight) - 1.6) < 0.02 && style.objectFit === 'contain';
  }));
  assert(partImagesShowWholeProduct, 'Featured part images fill their frames without cropping the product');
  assert((await page.locator('.featured-parts-section .square-action').count()) === 0,
    'Featured parts do not show add-to-cart controls');

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

  await page.goto(`${baseURL}/new-cars`, { waitUntil: 'networkidle' });
  await page.getByLabel('Make').selectOption('Mercedes-Benz');
  const mercedesCard = page.locator('.vehicle-card');
  assert((await mercedesCard.count()) === 1
    && (await mercedesCard.innerText()).includes('Mercedes-Benz GLE 450d 4MATIC')
    && (await mercedesCard.innerText()).includes('Year on request')
    && (await mercedesCard.innerText()).includes('Price on request'),
  'Journey 2: new Mercedes-Benz listing appears with on-request pricing');
  await mercedesCard.locator('h3 a').click();
  await page.waitForURL('**/vehicles/mercedes-benz-gle-450d-4matic');
  await page.waitForFunction(() => document.querySelectorAll('.gallery-thumbnails button').length === 4);
  assert((await page.locator('.gallery-thumbnails button').count()) === 4
    && (await page.locator('.gallery-main > img').getAttribute('src')) === '/images/mercedes-gle-front.webp',
  'Journey 2: Mercedes-Benz listing opens with all supplied photographs');

  await page.goto(`${baseURL}/new-cars`, { waitUntil: 'networkidle' });
  await page.getByLabel('Make').selectOption('Toyota');
  const landCruiserCard = page.locator('.vehicle-card');
  assert((await landCruiserCard.count()) === 1
    && (await landCruiserCard.innerText()).includes('Toyota Land Cruiser ZX V8')
    && (await landCruiserCard.innerText()).includes('Year on request')
    && (await landCruiserCard.innerText()).includes('Price on request'),
  'Journey 2: new Land Cruiser listing appears with on-request pricing');
  await landCruiserCard.locator('h3 a').click();
  await page.waitForURL('**/vehicles/toyota-land-cruiser-zx-v8');
  await page.waitForFunction(() => document.querySelectorAll('.gallery-thumbnails button').length === 4);
  assert((await page.locator('.gallery-thumbnails button').count()) === 4
    && (await page.locator('.gallery-main > img').getAttribute('src')) === '/images/land-cruiser-zx-front.webp',
  'Journey 2: Land Cruiser listing opens with all supplied photographs');

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
  await page.goto(`${baseURL}/cart`, { waitUntil: 'networkidle' });
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
  const mobileFeaturedLayout = await mobilePage.locator('.vehicle-featured-grid').evaluate((grid) => ({
    cardTops: [...grid.querySelectorAll('.vehicle-card')].map((card) => Math.round(card.getBoundingClientRect().top)),
    scrollable: grid.scrollWidth > grid.clientWidth,
  }));
  assert(mobileFeaturedLayout.cardTops.length > 1 && new Set(mobileFeaturedLayout.cardTops).size === 1 && mobileFeaturedLayout.scrollable,
    'Journey 4: featured vehicles remain inline in a horizontal row');
  const mobilePartsLayout = await mobilePage.locator('.part-featured-grid').evaluate((grid) => ({
    cardTops: [...grid.querySelectorAll('.part-card')].map((card) => Math.round(card.getBoundingClientRect().top)),
    scrollable: grid.scrollWidth > grid.clientWidth,
  }));
  assert(mobilePartsLayout.cardTops.length > 1 && new Set(mobilePartsLayout.cardTops).size === 1 && mobilePartsLayout.scrollable,
    'Journey 4: featured auto parts remain inline in a horizontal row');
  await mobilePage.getByRole('button', { name: 'Toggle navigation' }).click();
  await mobilePage.getByRole('link', { name: /Auto Parts/ }).first().click();
  await mobilePage.waitForURL('**/auto-parts');
  await mobilePage.getByLabel('Search auto parts').waitFor();
  await mobilePage.getByLabel('Search auto parts').fill('alternator');
  await mobilePage.locator('.part-card h3 a').click();
  await mobilePage.waitForURL('**/auto-parts/alternator-toyota-hilux');
  await mobilePage.getByRole('button', { name: /Add to Cart/i }).waitFor();
  await mobilePage.getByRole('button', { name: /Add to Cart/i }).click();
  await mobilePage.goto(`${baseURL}/cart`, { waitUntil: 'networkidle' });
  await mobilePage.locator('.cart-item').waitFor();
  assert((await mobilePage.locator('.cart-item').count()) === 1, 'Journey 4: mobile navigation, search, product page and cart work');
  await mobilePage.goBack({ waitUntil: 'networkidle' });
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
