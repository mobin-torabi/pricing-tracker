---
name: track-rental-ninja
description: Scrape Rental Ninja pricing (try.rental-ninja.com/pricing) for every condition and upsert it into its Google Sheet. Use when the user wants to check/update Rental Ninja prices, run the Rental Ninja tracker, or troubleshoot it.
---

# Track Rental Ninja pricing

Scrapes **https://try.rental-ninja.com/pricing** across every pricing condition and
syncs the results into the Rental Ninja Google Sheet (insert new condition rows,
update rows whose price changed, never duplicate).

## Project location
The root of this `pricing-tracker` project (the folder containing `run.js`). Run
commands from there.

## Conditions captured (one row each)
- **billing**: Monthly, Yearly
- **rentals**: 1 → ~495 (the slider's full selectable range; price changes continuously)
- **plan**: Pro Plan, Pro Connected, Growth Plan
- **currency**: EUR (the site offers no currency selector)

Per row it records: `per_rental_month`, `total_month`, `total_year`, and `extra`
(e.g. Growth's "+1% of sales"), plus `first_seen`, `last_updated`, `last_checked`.

## How to run
```
node run.js rental-ninja
```
Takes ~75 seconds. Output reports `inserted / price-updated / unchanged` and prints
the Google Sheet link at the end.

## Google Sheet
Each user has their OWN Google Sheet, auto-created in their own Google account on
first run, and its link is printed every run. The spreadsheet ID is stored locally
in `config.local.json` (git-ignored) under `sheets.rental-ninja.spreadsheetId` — it
is intentionally NOT hardcoded, so sharing the project never exposes anyone's sheet.

## Scheduling
Runs automatically every day (default **18:00 local**, set in `config.json`
`"schedule"`) via the local node-cron daemon (`scheduler.js`) — free, with
catch-up if the machine was off at the scheduled time. Enable autostart with
`install-autostart.cmd` (Windows) or `start-scheduler.sh` (macOS/Linux). Daemon
log: `logs/daemon.log`.

## Notes / troubleshooting
- Uses a headless browser via Playwright: system Chrome/Edge, else bundled
  Chromium (`lib/browser.js`). A realistic User-Agent is required.
- Google auth token lives in `credentials/token.json`. If a run fails with an auth
  error, re-run `node auth.js` (or the installer) and complete the browser login.
- Scraper logic: `scrapers/rental-ninja.js`; the sheet upsert: `lib/sheets.js`.
