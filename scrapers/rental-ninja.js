// Rental Ninja pricing scraper.
// Conditions: billing (Monthly/Yearly) x rentals (1..slider-max) x plan (3).
// Currency is EUR only. The per-rental price is a continuous function of the
// rental count, so we step the slider across its whole range and record every
// distinct rental count.
const { launch } = require('../lib/browser');

const URL = 'https://try.rental-ninja.com/pricing';
const PLAN_NAMES = ['PRO CONNECTED', 'PRO PLAN', 'GROWTH PLAN']; // order matters: match longest first

const num = (s) => {
  if (!s) return null;
  const m = String(s).replace(/[^\d.,]/g, '').replace(/,/g, '');
  const v = parseFloat(m);
  return Number.isFinite(v) ? v : null;
};

// Read the three plan cards at the current slider position.
// Strategy: find each compact price block (it contains "€N per rental/month"),
// then climb from the block to the ancestor that names the plan. The block is
// plan-specific, so this maps price -> plan reliably regardless of DOM order.
async function readCards(page) {
  return page.evaluate(() => {
    const PRICE_RE = /€\s?[\d.,]+\s*per rental\s*\/\s*month/i;
    const NAME_RE = /PRO CONNECTED|PRO PLAN|GROWTH PLAN/;
    const byPlan = {};
    const blocks = [...document.querySelectorAll('*')].filter(
      (e) => PRICE_RE.test(e.textContent || '')
    );
    for (const el of blocks) {
      // climb to the card that names the plan
      let node = el,
        plan = null,
        d = 0;
      while (node && d < 10) {
        const m = (node.textContent || '').match(NAME_RE);
        if (m) {
          plan = m[0];
          break;
        }
        node = node.parentElement;
        d++;
      }
      if (!plan) continue;
      const t = el.textContent || '';
      // keep the most specific (shortest) block per plan
      if (byPlan[plan] && t.length >= byPlan[plan]._len) continue;
      const card = node;
      byPlan[plan] = {
        _len: t.length,
        perRental: (t.match(/€\s?([\d.,]+)\s*per rental/i) || [])[1] || null,
        totalMonth:
          (t.replace(/€\s?[\d.,]+\s*per rental\s*\/\s*month/i, '').match(/€\s?([\d.,]+)\s*\/\s*month/i) || [])[1] || null,
        totalYear: (t.match(/€\s?([\d.,]+)\s*\/\s*year/i) || [])[1] || null,
        extra: /\+\s*1%\s*of sales/i.test((card && card.textContent) || '') ? '+1% of sales' : '',
      };
    }
    const out = {};
    for (const [plan, v] of Object.entries(byPlan)) {
      const { _len, ...rest } = v;
      out[plan] = rest;
    }
    return out;
  });
}

function deriveCount(cards) {
  const votes = [];
  for (const p of Object.values(cards)) {
    const pr = num(p.perRental),
      tm = num(p.totalMonth);
    if (pr && tm) votes.push(Math.round(tm / pr));
  }
  if (!votes.length) return null;
  // mode
  const counts = {};
  votes.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0], 10);
}

async function scrape({ log = console.log } = {}) {
  const { browser, page } = await launch();
  const rows = [];
  try {
    log('  loading page...');
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(3000);

    for (const billing of ['Monthly', 'Yearly']) {
      log(`  billing = ${billing}`);
      await page.click(`button:has-text("${billing}")`);
      await page.waitForTimeout(800);

      const slider = await page.$('[role=slider]');
      await slider.focus();
      await page.keyboard.press('Home');
      await page.waitForTimeout(150);

      const max = parseInt(await page.getAttribute('[role=slider]', 'aria-valuemax'), 10);
      const seenCounts = new Set();
      let guard = 0;

      while (guard++ <= max + 5) {
        const cards = await readCards(page);
        const count = deriveCount(cards);
        if (count != null && !seenCounts.has(count)) {
          seenCounts.add(count);
          for (const plan of Object.keys(cards)) {
            const c = cards[plan];
            rows.push({
              key: `${billing}|${count}|${plan}`,
              billing,
              rentals: count,
              plan,
              currency: 'EUR',
              per_rental_month: c.perRental || '',
              total_month: c.totalMonth || '',
              total_year: c.totalYear || '',
              extra: c.extra || '',
            });
          }
        }
        const now = parseInt(await page.getAttribute('[role=slider]', 'aria-valuenow'), 10);
        if (now >= max) break;
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(18);
      }
      log(`    captured ${seenCounts.size} distinct rental counts`);
    }
  } finally {
    await browser.close();
  }

  return {
    site: 'rental-ninja',
    columns: [
      'key', 'billing', 'rentals', 'plan', 'currency',
      'per_rental_month', 'total_month', 'total_year', 'extra',
    ],
    priceFields: ['per_rental_month', 'total_month', 'total_year', 'extra'],
    rows,
    scrapedAt: new Date().toISOString(),
  };
}

module.exports = { scrape };

// Allow standalone dry run: `node scrapers/rental-ninja.js`
if (require.main === module) {
  scrape().then((r) => {
    console.log(`\nTotal rows: ${r.rows.length}`);
    console.log('Sample:', JSON.stringify(r.rows.slice(0, 4), null, 1));
    console.log('Last:', JSON.stringify(r.rows.slice(-2), null, 1));
  });
}
