#!/usr/bin/env bash
# Daily Postgres backup -> compressed dump uploaded to MinIO, 30-day local retention.
# Cron: 0 2 * * * /opt/sevagan/scripts/backup-db.sh >> /var/log/sevagan-backup.log 2>&1
set -euo pipefail

ENV_FILE="/etc/sevagan/.env"
BACKUP_DIR="/var/backups/sevagan"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sevagan_${TIMESTAMP}.sql.gz"

set -a
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

docker exec sevagan-postgres pg_dump -U sevagan sevagan | gzip > "$BACKUP_DIR/$FILENAME"

docker run --rm --network sevagan-network \
  -e MC_HOST_sevagan="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@minio:9000" \
  -v "$BACKUP_DIR/$FILENAME:/backup/$FILENAME:ro" \
  minio/mc:RELEASE.2025-04-08T15-39-49Z \
  cp "/backup/$FILENAME" "sevagan/sevagan-backups/$FILENAME"

find "$BACKUP_DIR" -name 'sevagan_*.sql.gz' -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $FILENAME"
