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
    const initialTimeOrigin = await page.evaluate(() => performance.timeOrigin);

    for (const route of routes) {
      await page.getByRole('link', { name: route.link, exact: true }).first().click();
      await page.waitForURL(`**${route.path}`);
      await page.locator('h1').filter({ hasText: route.heading }).first().waitFor();
      await page.waitForFunction((path) => document.documentElement.dataset.routeReady === path, route.path);
      const state = await page.evaluate(() => ({
        loading: document.body.classList.contains('route-loading'),
        timeOrigin: performance.timeOrigin,
      }));
      if (state.loading) throw new Error(`Loading state did not clear on ${route.path}.`);
      if (state.timeOrigin !== initialTimeOrigin) throw new Error(`Unexpected document reload on ${route.path}.`);
    }

    await page.locator('.part-card h3 a').first().click();
    await page.waitForURL('**/auto-parts/alternator-toyota-hilux');
    await page.locator('h1').filter({ hasText: 'Alternator' }).waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.routeReady === '/auto-parts/alternator-toyota-hilux');

    if (errors.length || requestFailures.length) {
      throw new Error(JSON.stringify({ errors, requestFailures }));
    }
    console.log(`✓ ${name}: four route transitions passed without reload or browser errors.`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${name}: ${error.message}`);
  } finally {
    await browser?.close();
  }
}

if (failed) process.exit(1);
