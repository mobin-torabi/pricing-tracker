#!/usr/bin/env bash
# Starts the cron daemon in the background (macOS / Linux).
# For auto-start at boot/login, see README.md (cron @reboot or a systemd user service).
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js is required (https://nodejs.org/)"; exit 1; }
mkdir -p logs
nohup node scheduler.js >> logs/daemon.out 2>&1 &
echo "Scheduler started (PID $!). Log: logs/daemon.log"
