#!/usr/bin/env bash
# One-time bootstrap for the first TLS certificate on a fresh VPS.
#
# Problem this solves: nginx's config references
# /etc/letsencrypt/live/$DOMAIN_NAME/{fullchain,privkey,chain}.pem so it can
# terminate HTTPS — but nginx won't even start without those files existing,
# and certbot can't obtain a *real* certificate until nginx is up and serving
# the ACME HTTP-01 challenge on port 80. This script breaks that chicken-and-
# egg problem: it drops in a throwaway self-signed cert just so nginx can
# start, then asks certbot for the real one over that running nginx, then
# reloads nginx with it. Run this exactly once per domain; after that,
# `scripts/renew-certs.sh` (plain `certbot renew`) is all that's needed.
#
# Usage: DOMAIN_NAME=example.com LETSENCRYPT_EMAIL=you@example.com ./scripts/init-letsencrypt.sh
set -euo pipefail

: "${DOMAIN_NAME:?Set DOMAIN_NAME, e.g. DOMAIN_NAME=example.com ./scripts/init-letsencrypt.sh}"
: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL, e.g. LETSENCRYPT_EMAIL=you@example.com ./scripts/init-letsencrypt.sh}"

COMPOSE="docker compose"
LIVE_PATH="/etc/letsencrypt/live/${DOMAIN_NAME}"

echo "==> Creating a temporary self-signed certificate so nginx can start ..."
$COMPOSE run --rm --entrypoint "\
  mkdir -p ${LIVE_PATH} && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout ${LIVE_PATH}/privkey.pem \
    -out ${LIVE_PATH}/fullchain.pem \
    -subj '/CN=${DOMAIN_NAME}' && \
  cp ${LIVE_PATH}/fullchain.pem ${LIVE_PATH}/chain.pem" certbot

echo "==> Starting the database ..."
$COMPOSE up -d db

echo "==> Applying the database schema ..."
$COMPOSE --profile tools run --rm migrate

echo "==> Starting web and nginx (nginx now has a cert to boot with) ..."
$COMPOSE up -d web nginx

echo "==> Removing the dummy certificate ..."
$COMPOSE run --rm --entrypoint "rm -rf /etc/letsencrypt/live/${DOMAIN_NAME} \
  /etc/letsencrypt/archive/${DOMAIN_NAME} \
  /etc/letsencrypt/renewal/${DOMAIN_NAME}.conf" certbot

echo "==> Requesting the real certificate from Let's Encrypt ..."
$COMPOSE run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos --no-eff-email \
  -d "${DOMAIN_NAME}" -d "www.${DOMAIN_NAME}"

echo "==> Reloading nginx with the real certificate ..."
$COMPOSE exec nginx nginx -s reload

echo "==> Done. ${DOMAIN_NAME} is now serving a real Let's Encrypt certificate."
echo "    Set up scripts/renew-certs.sh on a schedule (see README) to keep it renewed."
