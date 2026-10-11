#!/bin/sh
set -eu

/pb/pocketbase superuser upsert \
  "$PB_SUPERUSER_EMAIL" \
  "$PB_SUPERUSER_PASSWORD" \
  --dir=/pb/pb_data \
  --migrationsDir=/pb/pb_migrations \
  --encryptionEnv=PB_ENCRYPTION_KEY

exec /pb/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir=/pb/pb_data \
  --migrationsDir=/pb/pb_migrations \
  --encryptionEnv=PB_ENCRYPTION_KEY
