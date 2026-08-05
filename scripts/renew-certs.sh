#!/usr/bin/env bash
# Renews the Let's Encrypt certificate if it's due, then reloads nginx so it
# picks up the renewed files. Safe to run on any schedule — certbot only
# actually renews within ~30 days of expiry, otherwise this is a no-op.
#
# Install as a cron job on the VPS (see README's "Automatic renewal"):
#   0 3 * * * cd /opt/chaitanya-stores && ./scripts/renew-certs.sh >> /var/log/certbot-renew.log 2>&1
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

docker compose run --rm certbot renew --webroot --webroot-path /var/www/certbot
docker compose exec nginx nginx -s reload
