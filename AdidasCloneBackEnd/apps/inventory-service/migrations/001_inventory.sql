BEGIN;

CREATE TABLE IF NOT EXISTS inventory_stock (
  variant_id INTEGER PRIMARY KEY CHECK (variant_id > 0),
  sku TEXT,
  on_hand_qty INTEGER NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
  reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0 AND reserved_qty <= on_hand_qty),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY,
  checkout_ref TEXT NOT NULL UNIQUE CHECK (length(checkout_ref) BETWEEN 1 AND 180),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 1 AND 180),
  request_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS inventory_reservations_expiry_idx
  ON inventory_reservations (expires_at, id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS inventory_reservation_items (
  reservation_id UUID NOT NULL REFERENCES inventory_reservations(id),
  variant_id INTEGER NOT NULL REFERENCES inventory_stock(variant_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (reservation_id, variant_id)
);
CREATE TABLE IF NOT EXISTS inventory_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) BETWEEN 1 AND 180),
  request_hash CHAR(64) NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id UUID PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES inventory_stock(variant_id),
  reservation_id UUID REFERENCES inventory_reservations(id),
  operation_key TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN
    ('INITIAL','ADJUST','RESERVE','COMMIT','RELEASE','EXPIRE')),
  delta_on_hand INTEGER NOT NULL,
  delta_reserved INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operation_key, variant_id, movement_type),
  CHECK (delta_on_hand <> 0 OR delta_reserved <> 0)
);
CREATE INDEX IF NOT EXISTS inventory_stock_movements_variant_time_idx
  ON inventory_stock_movements (variant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_outbox (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  envelope JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS inventory_outbox_pending_idx
  ON inventory_outbox (created_at, id) WHERE published_at IS NULL;

COMMIT;
