#!/bin/sh
set -eu
# Runs only when the isolated V2 PostgreSQL volume is first initialized.
# Seven logical databases. Notification uses delivery transport; its persistence is deferred.
for db in identity_db customer_db catalog_db inventory_db order_db payment_db promotion_db; do
  exists="$(psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$db'")"
  if [ "$exists" != "1" ]; then
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $db"
  fi
done
