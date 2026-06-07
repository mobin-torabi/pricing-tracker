# Pricing Tracker

Scrapes **Rental Ninja** (`try.rental-ninja.com/pricing`) and **Lodgify**
(`get.lodgify.com/pricing`) across **every pricing condition** and records them in
**your own Google Sheets** — one row per condition the first time, then updating
only rows whose price changed (no duplicates). Runs automatically once a day.

Conditions captured:
- **Rental Ninja** — billing (Monthly/Yearly) × rentals (1→~500) × plan
  (Pro / Pro Connected / Growth). EUR only.
- **Lodgify** — billing (Monthly / Yearly / Bi-Yearly) × currency (USD/EUR/GBP) ×
  properties (1→100) × plan (Basic/Starter/Professional/Ultimate), incl. per-plan
  availability.

---

## Install (one step)

- **Windows:** double-click **`INSTALL.cmd`**
- **macOS / Linux:** run **`./install.sh`**

That single file does everything automatically: installs Node.js if missing,
installs dependencies and a browser, creates **your own** Google Sheets, fills
them, and turns on the daily run.

**First time only:** you connect your own Google account — a free ~2-minute step
in **`credentials/SETUP.md`** (create a Google OAuth client and drop the JSON into
`credentials/`). The installer tells you if it's needed, then continues.

**The one click that can't be automated:** when a browser window opens during
install, pick your Google account and click **Allow** (Google does not allow a
program to log into your account for you). If you see "Google hasn't verified this
app", click **Advanced → Continue** (it's your own app).

When it finishes, your two sheets exist in your Google Drive and update every day
at 18:00 (local). Links are printed at the end and saved in `config.local.json`.

---

## Sharing it with someone

Anyone can clone this repo and run the one installer. They get **their own**
Google login, **their own** sheets, **their own** schedule — nothing of yours is
shared. Their one-time setup is `credentials/SETUP.md` (make a free Google OAuth
client), then `INSTALL`.

Your secrets never leave your machine: `.gitignore` excludes your login
(`credentials/token.json`), your OAuth client (`credentials/oauth_client.json`),
your sheet IDs (`config.local.json`) and `logs/`.

---

## Everyday use / commands

| Command | Action |
|---|---|
| `INSTALL.cmd` / `./install.sh` | Full one-click install (above) |
| `npm run scrape` | Scrape both sites now and sync to your sheets |
| `npm run scrape:rental-ninja` / `:lodgify` | Scrape one site |
| `npm run auth` | Re-authorize your Google account (if a daily run reports an auth error) |
| `node setup.js` | Re-run the bootstrap/doctor (deps + browser + auth) |
| `install-autostart.cmd` / `uninstall-autostart.cmd` (Win) | Enable / disable the daily auto-run |

## Scheduling

A small **node-cron daemon** (`scheduler.js`) runs the scrape daily — default
`0 18 * * *` (18:00 local). Change it in **`config.json`** (`"schedule"`). It is
free, **catches up** a missed run if the machine was off/asleep at the scheduled
time, and won't run twice at once.

Autostart at boot/login: Windows uses `INSTALL.cmd` / `install-autostart.cmd`
(Startup folder). macOS/Linux: a LaunchAgent / systemd user service / `@reboot`
cron calling `node scheduler.js` (or `start-scheduler.sh`).

## Requirements

- **Node.js 18+** — the installer auto-installs it on Windows (winget) and tries
  brew/apt/dnf on macOS/Linux; otherwise grab it from <https://nodejs.org/>.
- A browser — system Chrome/Edge is used if present, otherwise a private Chromium
  is downloaded automatically. **Python is not required.**

## Project layout

```
INSTALL.cmd / install.sh   One-click installer
run.js                     Scrape + sync (a single run)
scheduler.js               Cron daemon (daily automation)
setup.js                   Bootstrap / doctor
auth.js                    One-time Google sign-in
config.json                Shared settings (schedule, sheet titles) - no IDs
config.local.json          Your sheet IDs (git-ignored, auto-created)
lib/                       browser.js (headless) + sheets.js (upsert)
scrapers/                  Per-site scrapers
credentials/               Your OAuth client + token (both git-ignored) + SETUP.md
logs/                      Run logs (git-ignored)
```
