// Scrape one or both sites and upsert into their Google Sheets.
//   node run.js              -> both sites
//   node run.js rental-ninja -> just Rental Ninja
//   node run.js lodgify      -> just Lodgify
const fs = require('fs');
const path = require('path');
const { getAuth, loadConfig, ensureSpreadsheet, syncSheet, google } = require('./lib/sheets');

const SCRAPERS = {
  'rental-ninja': () => require('./scrapers/rental-ninja'),
  lodgify: () => require('./scrapers/lodgify'),
};

const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const logFile = path.join(LOG_DIR, `run-${new Date().toISOString().slice(0, 10)}.log`);
function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

async function runSite(site, auth, cfg) {
  log(`=== ${site}: scraping ===`);
  const { scrape } = SCRAPERS[site]();
  const result = await scrape({ log });
  log(`${site}: scraped ${result.rows.length} rows`);

  const sheetsApi = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = await ensureSpreadsheet(sheetsApi, cfg, site);

  const stats = await syncSheet(auth, {
    spreadsheetId,
    tab,
    columns: result.columns,
    priceFields: result.priceFields,
    rows: result.rows,
  });
  log(
    `${site}: synced -> inserted ${stats.inserted}, price-updated ${stats.updated}, ` +
      `unchanged ${stats.unchanged}, orphans kept ${stats.orphans} (sheet ${spreadsheetId})`
  );
}

async function main() {
  const arg = process.argv[2];
  const sites = arg ? [arg] : Object.keys(SCRAPERS);
  for (const s of sites) {
    if (!SCRAPERS[s]) {
      log(`Unknown site "${s}". Valid: ${Object.keys(SCRAPERS).join(', ')}`);
      process.exit(1);
    }
  }
  const auth = getAuth();
  const cfg = loadConfig();
  for (const site of sites) {
    try {
      await runSite(site, auth, cfg);
    } catch (e) {
      log(`${site}: ERROR ${e.stack || e.message}`);
    }
  }
  log('done.');
}

main().catch((e) => {
  log('FATAL ' + (e.stack || e.message));
  process.exit(1);
});
