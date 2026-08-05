#!/usr/bin/env bash
# Backs up the Postgres database and the uploads volume to ./backups, and
# (if S3 credentials are set) pushes both off-server to any S3-compatible
# object storage provider. A named Docker volume protects against a bad
# redeploy, but NOT against disk failure or VPS loss — this is the layer
# that does.
#
# Required env (from .env, or export before running):
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
# Optional, to also push off-server to S3-compatible storage (e.g. Backblaze
# B2, Cloudflare R2, Hostinger Object Storage, or any other S3-compatible
# provider):
#   S3_BUCKET, S3_ENDPOINT (e.g. https://s3.eu-central-003.backblazeb2.com),
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (access/secret key pair)
#
# Install as a nightly cron job (see README's "Backups" section):
#   0 2 * * * cd /opt/chaitanya-stores && ./scripts/backup.sh >> /var/log/chaitanya-backup.log 2>&1
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f .env ] && set -a && source .env && set +a

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="./backups"
DB_DUMP="${BACKUP_DIR}/db-${TIMESTAMP}.sql.gz"
UPLOADS_TAR="${BACKUP_DIR}/uploads-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "==> Dumping Postgres (${POSTGRES_DB}) ..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DB_DUMP}"

echo "==> Archiving the uploads volume ..."
docker compose run --rm -v "$(pwd)/${BACKUP_DIR}:/backup" backup \
  tar czf "/backup/uploads-${TIMESTAMP}.tar.gz" -C /data .

echo "==> Local backups written:"
echo "    ${DB_DUMP}"
echo "    ${UPLOADS_TAR}"

if [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ENDPOINT:-}" ]; then
  echo "==> Pushing to S3-compatible storage (s3://${S3_BUCKET}) ..."
  aws --endpoint-url "${S3_ENDPOINT}" s3 cp "${DB_DUMP}" "s3://${S3_BUCKET}/db/"
  aws --endpoint-url "${S3_ENDPOINT}" s3 cp "${UPLOADS_TAR}" "s3://${S3_BUCKET}/uploads/"
else
  echo "==> S3_BUCKET/S3_ENDPOINT not set — skipping off-server upload (local backup only)."
fi

echo "==> Pruning local backups older than 14 days ..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +14 -delete
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +14 -delete

echo "==> Backup complete."
