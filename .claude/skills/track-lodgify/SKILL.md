---
name: track-lodgify
description: Scrape Lodgify pricing (get.lodgify.com/pricing) for every condition (billing x currency x properties x plan) and upsert it into its Google Sheet. Use when the user wants to check/update Lodgify prices, run the Lodgify tracker, or troubleshoot it.
---

# Track Lodgify pricing

Scrapes **https://get.lodgify.com/pricing** across every pricing condition and
syncs the results into the Lodgify Google Sheet (insert new condition rows,
update rows whose price changed, never duplicate).

## Project location
The root of this `pricing-tracker` project (the folder containing `run.js`). Run
commands from there.

## Conditions captured (one row each)
- **billing**: Monthly, Yearly (-20%), Bi-Yearly (-25%)
- **currency**: USD, EUR, GBP
- **properties**: 1 → 100 (the input clamps at 100, so that is the plateau)
- **plan**: Basic, Starter, Professional, Ultimate

Per row it records: `price_month` (discounted monthly-equivalent for the chosen
billing), `original_price` (undiscounted), and `available` (yes/no — Basic and
Starter become unavailable above their property limits, shown as "-" on the
site), plus `first_seen`, `last_updated`, `last_checked`.

## How to run
```
node run.js lodgify
```
Takes ~5 minutes (3,600 conditions). Output reports `inserted / price-updated /
unchanged` and prints the Google Sheet link at the end.

## Google Sheet
Each user has their OWN Google Sheet, auto-created in their own Google account on
first run, and its link is printed every run. The spreadsheet ID is stored locally
in `config.local.json` (git-ignored) under `sheets.lodgify.spreadsheetId` — it is
intentionally NOT hardcoded, so sharing the project never exposes anyone's sheet.

## Scheduling
Runs automatically every day (default **18:00 local**, set in `config.json`
`"schedule"`) via the local node-cron daemon (`scheduler.js`) — free, with
catch-up if the machine was off at the scheduled time. Enable autostart with
`install-autostart.cmd` (Windows) or `start-scheduler.sh` (macOS/Linux). Daemon
log: `logs/daemon.log`.

## Notes / troubleshooting
- Lodgify returns HTTP 403 to plain requests; the scraper uses a real browser with
  a realistic User-Agent (`lib/browser.js`) and dismisses the OneTrust cookie banner.
- The property-count input is React-controlled; prices only recompute when set via
  Playwright `fill()` (see `setCount` in `scrapers/lodgify.js`).
- A hidden duplicate "Starter" card on the page is filtered out (only visible cards
  are read).
- Google auth token lives in `credentials/token.json`; re-run `node auth.js` if it
  ever expires. Logs in `logs/`.
