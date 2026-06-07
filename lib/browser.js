// Shared Playwright browser helpers — cross-platform and resilient.
//
// Browser resolution order (first that works wins):
//   1. system Google Chrome   (channel: 'chrome')
//   2. system Microsoft Edge  (channel: 'msedge')
//   3. Playwright's bundled Chromium (installed via `npx playwright install chromium`)
//
// This covers machines that already have a browser and machines that don't (the
// bundled Chromium is fetched by setup). A realistic User-Agent is required or
// Lodgify returns HTTP 403 (bot protection).
const { chromium } = require('playwright');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

async function launchBrowser() {
  const attempts = [
    { channel: 'chrome' },
    { channel: 'msedge' },
    {}, // bundled Chromium
  ];
  const errors = [];
  for (const opts of attempts) {
    try {
      return await chromium.launch({ headless: true, ...opts });
    } catch (e) {
      errors.push(`${opts.channel || 'bundled-chromium'}: ${e.message.split('\n')[0]}`);
    }
  }
  throw new Error(
    'No usable browser found. Install Chrome or Edge, or run ' +
      '`npx playwright install chromium`.\nTried:\n  ' +
      errors.join('\n  ')
  );
}

async function launch() {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 1100 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  return { browser, context, page };
}

// Dismiss the OneTrust cookie banner if present (it intercepts clicks otherwise).
async function dismissConsent(page) {
  try {
    await page.click('#onetrust-accept-btn-handler', { timeout: 8000 });
    await page.waitForTimeout(1200);
  } catch (_) {
    /* no banner */
  }
}

module.exports = { launch, launchBrowser, dismissConsent, UA };
