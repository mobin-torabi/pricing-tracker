// Cross-platform bootstrap / doctor.
// Verifies the runtime, installs dependencies, guarantees a working browser,
// checks Google credentials, and runs the one-time authorization.
// Safe to re-run any time. Usage: `node setup.js` (or setup.cmd / setup.sh).
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const log = (...a) => console.log(...a);
const section = (t) => log('\n=== ' + t + ' ===');

(async function main() {
  log('Pricing Tracker — setup\n');

  // 1) Runtime
  section('1) Runtime');
  log(`Node.js ${process.version} on ${process.platform}/${process.arch}`);
  if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
    log('[!] Node.js 18+ is required. Upgrade at https://nodejs.org/');
    process.exit(1);
  }
  log('Python is NOT required by this project.');

  // 2) Dependencies
  section('2) Dependencies');
  if (!fs.existsSync(path.join(ROOT, 'node_modules', 'playwright'))) {
    log('Installing npm dependencies (npm install)...');
    execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
  } else {
    log('npm dependencies already installed.');
  }

  // 3) Browser (system Chrome/Edge, else bundled Chromium)
  section('3) Browser');
  const { launchBrowser } = require('./lib/browser');
  const browserOk = async () => {
    try { const b = await launchBrowser(); await b.close(); return true; }
    catch (e) { log('  ' + e.message.split('\n')[0]); return false; }
  };
  if (await browserOk()) {
    log('A working browser is available.');
  } else {
    log('No system browser detected — downloading Playwright Chromium...');
    try { execSync('npx playwright install chromium', { cwd: ROOT, stdio: 'inherit' }); } catch (_) {}
    if (await browserOk()) log('Bundled Chromium installed and working.');
    else { log('[!] No usable browser. Install Chrome/Edge (or fix network) and re-run setup.'); process.exit(1); }
  }

  // 4) Google OAuth client (per-user, never shipped)
  section('4) Google credentials');
  const cred = path.join(ROOT, 'credentials', 'oauth_client.json');
  if (!fs.existsSync(cred)) {
    log('[!] Missing credentials/oauth_client.json — your OWN Google OAuth client.');
    log('    See credentials/SETUP.md for the free ~2-minute steps, then re-run setup.');
    process.exit(1);
  }
  log('OAuth client found.');

  // 5) Authorize (one-time browser login -> token.json)
  section('5) Authorize your Google account');
  const token = path.join(ROOT, 'credentials', 'token.json');
  if (!fs.existsSync(token)) {
    log('Opening your browser for a one-time Google authorization...');
    const r = spawnSync(process.execPath, ['auth.js'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0 || !fs.existsSync(token)) {
      log('[!] Authorization did not complete. Re-run setup to try again.');
      process.exit(1);
    }
  } else {
    log('Already authorized (credentials/token.json present).');
  }

  section('Done');
  log('Setup complete. Next steps:');
  log('  npm run scrape        # scrape both sites -> creates YOUR OWN Google Sheets on first run');
  log('  Daily automation:');
  log('    Windows : run  install-autostart.cmd');
  log('    macOS/Linux: ./start-scheduler.sh   (see README.md for boot autostart)');
})().catch((e) => { console.error('\nSetup failed:', e.message); process.exit(1); });
