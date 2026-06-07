#!/usr/bin/env bash
# =====================================================================
#  Pricing Tracker - one-command installer (macOS / Linux)
#  Run:  ./install.sh
#  Does everything: Node (if missing) -> deps + browser -> Google sign-in
#  (one "Allow" click) -> creates YOUR sheets -> starts the daily run.
# =====================================================================
set -e
cd "$(dirname "$0")"
echo "============================================"
echo "  Pricing Tracker - Installer"
echo "============================================"

# 1) Ensure Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Attempting automatic install..."
  if command -v brew >/dev/null 2>&1; then brew install node
  elif command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y nodejs npm
  elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y nodejs
  else echo "[!] Please install Node.js from https://nodejs.org/ and re-run."; exit 1; fi
fi
echo "Using Node $(node --version)"

# 2) deps + browser + Google authorization (opens browser once for "Allow")
echo "First time only: if asked, follow credentials/SETUP.md (~2 min) then re-run."
echo "A browser will open once - pick your Google account and click Allow."
node setup.js

# 3) first scrape -> creates your own sheets and fills them
echo "Creating your Google Sheets and collecting prices (a few minutes)..."
node run.js

# 4) start the daily scheduler now
./start-scheduler.sh
echo "============================================"
echo "  All done! Your sheets were created; daily run is on."
echo "  (For start-at-boot, see README.md.)"
echo "============================================"
