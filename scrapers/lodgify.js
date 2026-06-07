// Lodgify pricing scraper.
// Conditions: billing (Monthly/Yearly/Bi-Yearly) x currency (USD/EUR/GBP)
//   x properties (1..100) x plan (Basic/Starter/Professional/Ultimate).
// Some plans become unavailable above a property limit (price shows "-").
const { launch, dismissConsent } = require('../lib/browser');

const URL = 'https://get.lodgify.com/pricing';
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const BILLINGS = ['Monthly', 'Yearly', 'Bi-Yearly'];
const MAX_PROPS = parseInt(process.env.MAXC || '100', 10);

async function setCount(page, v) {
  // Playwright's fill() types into the controlled input so React recomputes the
  // prices; a native value setter does NOT reliably trigger the recompute.
  await page.fill('input[type=number]', String(v));
  await page.dispatchEvent('input[type=number]', 'input');
  await page.dispatchEvent('input[type=number]', 'change');
  await page.keyboard.press('Tab');
}

async function clickByText(page, selector, text, { startsWith = false } = {}) {
  await page.evaluate(
    ({ selector, text, startsWith }) => {
      const els = [...document.querySelectorAll(selector)];
      const el = els.find((e) => {
        const t = (e.textContent || '').trim();
        return startsWith ? t.startsWith(text) : t === text;
      });
      if (el) el.click();
    },
    { selector, text, startsWith }
  );
}

// Read the visible plan cards.
async function readCards(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('.pricing-card_container')]
      .filter((c) => c.offsetParent !== null) // skip hidden template card
      .map((c) => {
        const name = (c.querySelector('.heading_wrap, h2')?.textContent || '').trim();
        const main = (c.querySelector('.main-price')?.textContent || '').replace(/\s+/g, ' ').trim();
        const orig = (c.querySelector('.original-price_container .original-price')?.textContent || '').trim();
        const priceNum = (main.match(/([\d][\d.,]*)/) || [])[1] || '';
        const origNum = (orig.match(/([\d][\d.,]*)/) || [])[1] || '';
        return { name, price: priceNum, original: origNum, available: priceNum ? 'yes' : 'no' };
      });
  });
}

// Read the cards repeatedly until two consecutive reads are identical, so we
// capture the prices only after the page has finished recomputing them.
// Avoids spurious "price changed" noise from reading mid-update.
async function readStable(page, { tries = 14, gap = 130 } = {}) {
  let prev = null;
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(gap);
    const cur = await readCards(page);
    const s = JSON.stringify(cur);
    if (s === prev) return cur;
    prev = s;
  }
  return JSON.parse(prev);
}

async function scrape({ log = console.log } = {}) {
  const { browser, page } = await launch();
  const rows = [];
  try {
    log('  loading page...');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(5000);
    await dismissConsent(page);

    for (const currency of CURRENCIES) {
      await clickByText(page, 'span', currency);
      await page.waitForTimeout(700);
      for (const billing of BILLINGS) {
        await clickByText(page, 'label', billing, { startsWith: true });
        await page.waitForTimeout(700);
        log(`  ${currency} / ${billing}`);
        for (let props = 1; props <= MAX_PROPS; props++) {
          await setCount(page, props);
          const cards = await readStable(page);
          for (const card of cards) {
            if (!card.name) continue;
            rows.push({
              key: `${billing}|${currency}|${props}|${card.name}`,
              billing,
              currency,
              properties: props,
              plan: card.name,
              price_month: card.price,
              original_price: card.original,
              available: card.available,
            });
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  return {
    site: 'lodgify',
    columns: ['key', 'billing', 'currency', 'properties', 'plan', 'price_month', 'original_price', 'available'],
    priceFields: ['price_month', 'original_price', 'available'],
    rows,
    scrapedAt: new Date().toISOString(),
  };
}

module.exports = { scrape };

if (require.main === module) {
  scrape().then((r) => {
    console.log(`\nTotal rows: ${r.rows.length}`);
    console.log('Sample:', JSON.stringify(r.rows.slice(0, 6), null, 1));
  });
}
