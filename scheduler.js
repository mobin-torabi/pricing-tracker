// Local cron daemon for the pricing tracker.
// Runs continuously and triggers `node run.js` on a cron schedule (default 18:00
// local). Free (no Claude usage). Designed to be auto-started at login by the
// Startup-folder launcher (start-scheduler.vbs) instead of Windows Task Scheduler.
//
// Features:
//   - cron syntax via node-cron, in the machine's local timezone
//   - catch-up: if the PC was off at the scheduled time, runs once on startup
//   - singleton: a second instance exits instead of double-running
//   - never overlaps its own runs
//
// Env overrides:
//   CRON   - cron expression (default "0 18 * * *")
//   DRYRUN - "1" to log fires without actually scraping (for testing)
const cron = require('node-cron');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const DAEMON_LOG = path.join(LOG_DIR, 'daemon.log');
const SCRAPE_LOG = path.join(LOG_DIR, 'scheduler.log');
const STATE = path.join(LOG_DIR, 'last-run.json');
function configSchedule() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')).schedule; } catch { return null; }
}
// Precedence: CRON env override > config.json "schedule" > default 6pm.
const SCHEDULE = process.env.CRON || configSchedule() || '0 18 * * *';
const DRYRUN = process.env.DRYRUN === '1';
const LOCK_PORT = 5859; // singleton guard

function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  fs.appendFileSync(DAEMON_LOG, line + '\n');
}
const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const saveState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

let running = false;
function runScrape(reason) {
  if (running) { log(`skip: a run is already in progress (trigger: ${reason})`); return; }
  running = true;
  log(`run start (${reason})`);
  if (DRYRUN) {
    log('DRYRUN: would run `node run.js` now');
    running = false;
    const s = loadState(); s.lastRunDate = todayStr(); s.lastRunAt = new Date().toISOString(); saveState(s);
    return;
  }
  const out = fs.openSync(SCRAPE_LOG, 'a');
  const child = spawn(process.execPath, [path.join(ROOT, 'run.js')], { cwd: ROOT, stdio: ['ignore', out, out] });
  child.on('exit', (code) => {
    running = false;
    fs.closeSync(out);
    log(`run finished (exit ${code})`);
    const s = loadState(); s.lastRunDate = todayStr(); s.lastRunAt = new Date().toISOString(); saveState(s);
  });
}

// If the scheduled time already passed today and we have not run today, run now.
function maybeCatchUp() {
  const parts = SCHEDULE.split(/\s+/);
  const mn = parseInt(parts[0], 10);
  const hr = parseInt(parts[1], 10);
  if (Number.isNaN(mn) || Number.isNaN(hr)) return; // only for simple "M H * * *"
  const now = new Date();
  const sched = new Date(now);
  sched.setHours(hr, mn, 0, 0);
  if (now >= sched && loadState().lastRunDate !== todayStr()) {
    log('catch-up: scheduled time already passed today with no run yet');
    runScrape('catch-up');
  }
}

function start() {
  if (!cron.validate(SCHEDULE)) {
    log(`invalid cron expression: "${SCHEDULE}"`);
    process.exit(1);
  }
  log(`daemon started; schedule "${SCHEDULE}" local time${DRYRUN ? ' [DRYRUN]' : ''}`);
  cron.schedule(SCHEDULE, () => runScrape('cron'));
  // Catch-up at startup AND periodically: if the PC slept through the scheduled
  // time (so node-cron skipped the fire) the periodic check runs it once the PC
  // is awake again. The lastRunDate guard prevents double-running the same day.
  maybeCatchUp();
  setInterval(maybeCatchUp, 5 * 60 * 1000);
}

// Singleton: bind a localhost port; if already in use, another daemon is running.
const guard = net.createServer();
guard.once('error', (e) => {
  if (e.code === 'EADDRINUSE') { log('another scheduler instance is already running; exiting'); process.exit(0); }
  throw e;
});
guard.listen(LOCK_PORT, '127.0.0.1', start);
