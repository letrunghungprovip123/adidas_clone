-- V2-only development databases. Executes on fresh V2 volume initialization.
-- Also safe to rerun manually on an existing V2 PostgreSQL instance.
-- psql's \gexec executes one CREATE DATABASE command per missing database.
-- Nothing here references V1/mydb or deletes an existing database.
SELECT format('CREATE DATABASE %I', wanted.name)
FROM (VALUES
  ('identity_db'),
  ('customer_db'),
  ('catalog_db'),
  ('inventory_db'),
  ('order_db'),
  ('payment_db'),
  ('promotion_db')
) AS wanted(name)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database AS existing WHERE existing.datname = wanted.name
)
\gexec
