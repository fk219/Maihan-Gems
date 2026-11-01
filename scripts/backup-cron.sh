#!/usr/bin/env bash
# Install (or print) a daily database-backup cron entry.
#   scripts/backup-cron.sh            -> print the entry
#   scripts/backup-cron.sh --install  -> append it to the current crontab
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${DATABASE_URL:?DATABASE_URL is required}"
mkdir -p "$ROOT/logs"
ENTRY="0 3 * * * cd $ROOT && DATABASE_URL='$DATABASE_URL' node scripts/backup-db.mjs >> $ROOT/logs/backup.log 2>&1"

if [[ "${1:-}" == "--install" ]]; then
  if ! command -v crontab >/dev/null 2>&1; then
    echo "crontab not found. Add this entry manually:" >&2
    echo "$ENTRY"
    exit 1
  fi
  (crontab -l 2>/dev/null | grep -v 'scripts/backup-db.mjs' || true; echo "$ENTRY") | crontab -
  echo "installed: $ENTRY"
else
  echo "$ENTRY"
fi
