#!/usr/bin/env bash
# macOS / Linux one-command setup:  ./setup.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js is required: https://nodejs.org/  (macOS: brew install node)"; exit 1; }
node setup.js
