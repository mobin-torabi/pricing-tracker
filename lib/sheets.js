// Google Sheets auth + upsert sync.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ROOT = path.join(__dirname, '..');
const CRED = path.join(ROOT, 'credentials', 'oauth_client.json');
const TOKEN = path.join(ROOT, 'credentials', 'token.json');
const CONFIG = path.join(ROOT, 'config.json'); // shared, committed (no IDs)
const LOCAL = path.join(ROOT, 'config.local.json'); // per-user, gitignored (sheet IDs)
const PORT = 5858;

// Meta columns appended to every sheet (after the scraped columns).
const META = ['first_seen', 'last_updated', 'last_checked'];

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
};

// Merge the shared config with the per-user local config so each person's own
// spreadsheet IDs (created in their own Google account) overlay the defaults.
function loadConfig() {
  const base = readJson(CONFIG);
  const local = readJson(LOCAL);
  base.sheets = base.sheets || {};
  for (const [site, v] of Object.entries(local.sheets || {})) {
    base.sheets[site] = { ...(base.sheets[site] || {}), ...v };
  }
  return base;
}

// Persist a newly created spreadsheet ID to the per-user (gitignored) file only,
// so it is never shared with anyone you give the project to.
function saveSpreadsheetId(site, spreadsheetId) {
  const local = readJson(LOCAL);
  local.sheets = local.sheets || {};
  local.sheets[site] = { ...(local.sheets[site] || {}), spreadsheetId };
  fs.writeFileSync(LOCAL, JSON.stringify(local, null, 2));
}

function getAuth() {
  if (!fs.existsSync(TOKEN)) {
    throw new Error('Not authorized yet. Run `node auth.js` once first.');
  }
  const { installed } = JSON.parse(fs.readFileSync(CRED, 'utf8'));
  const client = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    `http://localhost:${PORT}`
  );
  client.setCredentials(JSON.parse(fs.readFileSync(TOKEN, 'utf8')));
  // Persist refreshed tokens so the refresh_token is never lost.
  client.on('tokens', (t) => {
    const cur = JSON.parse(fs.readFileSync(TOKEN, 'utf8'));
    fs.writeFileSync(TOKEN, JSON.stringify({ ...cur, ...t }, null, 2));
  });
  return client;
}

// Ensure a spreadsheet exists for `site`; create it (with the data tab) if not.
async function ensureSpreadsheet(sheetsApi, cfg, site) {
  const entry = cfg.sheets[site];
  const tab = cfg.sheetTab || 'prices';
  if (entry.spreadsheetId) return { spreadsheetId: entry.spreadsheetId, tab };

  const res = await sheetsApi.spreadsheets.create({
    requestBody: {
      properties: { title: entry.title || `${site} pricing` },
      sheets: [{ properties: { title: tab } }],
    },
  });
  entry.spreadsheetId = res.data.spreadsheetId;
  saveSpreadsheetId(site, res.data.spreadsheetId);
  console.log(`  created your spreadsheet: ${res.data.spreadsheetUrl}`);
  return { spreadsheetId: entry.spreadsheetId, tab };
}

async function ensureTab(sheetsApi, spreadsheetId, tab) {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some((s) => s.properties.title === tab);
  if (!exists) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
}

// Upsert: insert new condition rows, update rows whose price changed, preserve
// first_seen, and refresh last_checked. Keyed by the first column ("key").
async function syncSheet(auth, { spreadsheetId, tab, columns, priceFields, rows }) {
  const sheetsApi = google.sheets({ version: 'v4', auth });
  await ensureTab(sheetsApi, spreadsheetId, tab);

  const header = [...columns, ...META];
  const now = new Date().toISOString();

  // Read existing data.
  const existing = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });
  const values = existing.data.values || [];
  const hdr = values[0] || [];
  const idx = (name) => hdr.indexOf(name);

  // Map existing rows by key.
  const prev = new Map();
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const key = r[0];
    if (key) prev.set(key, r);
  }

  let inserted = 0,
    updated = 0,
    unchanged = 0;

  const outRows = rows.map((row) => {
    const base = columns.map((c) => (row[c] != null ? String(row[c]) : ''));
    const old = prev.get(row.key);
    if (!old) {
      inserted++;
      return [...base, now, now, now];
    }
    // Compare price fields against stored values.
    const changed = priceFields.some((f) => {
      const ci = idx(f);
      const oldVal = ci >= 0 ? old[ci] || '' : '';
      return oldVal !== (row[f] != null ? String(row[f]) : '');
    });
    const firstSeen = idx('first_seen') >= 0 ? old[idx('first_seen')] || now : now;
    const lastUpdated = changed ? now : idx('last_updated') >= 0 ? old[idx('last_updated')] || now : now;
    if (changed) updated++;
    else unchanged++;
    return [...base, firstSeen, lastUpdated, now];
  });

  // Preserve any rows present in the sheet but absent from this scrape (orphans).
  const scrapedKeys = new Set(rows.map((r) => r.key));
  const orphans = [];
  for (const [key, r] of prev) {
    if (!scrapedKeys.has(key)) orphans.push(r);
  }

  const body = [header, ...outRows, ...orphans];

  // Clear then write everything in one shot.
  await sheetsApi.spreadsheets.values.clear({ spreadsheetId, range: `${tab}!A:Z` });
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: body },
  });

  return { inserted, updated, unchanged, orphans: orphans.length, total: outRows.length };
}

module.exports = { getAuth, loadConfig, ensureSpreadsheet, syncSheet, google };
