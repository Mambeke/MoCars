import { chromium, firefox, webkit } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browsers = [['Chromium', chromium], ['Firefox', firefox], ['WebKit', webkit]];
const routes = [
  { link: 'Used Cars', heading: 'Used Cars for Sale', path: '/used-cars' },
  { link: 'New Cars', heading: 'New Cars for Sale', path: '/new-cars' },
  { link: 'Auto Parts', heading: 'Auto Parts', path: '/auto-parts' },
];

let failed = false;
for (const [name, browserType] of browsers) {
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    const requestFailures = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    let previousTimeOrigin = await page.evaluate(() => performance.timeOrigin);

    for (const route of routes) {
      await page.getByRole('link', { name: route.link, exact: true }).first().click();
      await page.waitForURL(`**${route.path}`);
      await page.locator('h1').filter({ hasText: route.heading }).first().waitFor();
      const currentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
      if (currentTimeOrigin === previousTimeOrigin) {
        throw new Error(`Expected normal browser navigation on ${route.path}.`);
      }
      previousTimeOrigin = currentTimeOrigin;
    }

    await page.locator('.part-card h3 a').first().click();
    await page.waitForURL('**/auto-parts/alternator-toyota-hilux');
    await page.locator('h1').filter({ hasText: 'Alternator' }).waitFor();

    if (errors.length || requestFailures.length) {
      throw new Error(JSON.stringify({ errors, requestFailures }));
    }
    console.log(`✓ ${name}: four browser page loads passed without errors or manual refresh.`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${name}: ${error.message}`);
  } finally {
    await browser?.close();
  }
}

if (failed) process.exit(1);
