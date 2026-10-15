#!/bin/sh
# Nightly backup: database dump + uploads archive, 14-day rotation. Install with:
#   (crontab -l; echo "30 2 * * * cd /srv/research && ./scripts/backup.sh >> backups/backup.log 2>&1") | crontab -
set -eu
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm backup
