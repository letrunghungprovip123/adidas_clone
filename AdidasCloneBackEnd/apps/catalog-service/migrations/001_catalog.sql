BEGIN;
CREATE TABLE IF NOT EXISTS catalog_categories(
 id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 slug VARCHAR(120) NOT NULL UNIQUE, description TEXT,
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
 parent_id INTEGER REFERENCES catalog_categories(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog_products(
 id INTEGER PRIMARY KEY,
 name VARCHAR(255) NOT NULL CHECK(length(btrim(name))>0),
 slug VARCHAR(255) NOT NULL UNIQUE,
 description TEXT,
 base_price_vnd NUMERIC(16,2) NOT NULL CHECK(base_price_vnd>=0),
 category_id INTEGER REFERENCES catalog_categories(id),
 brand VARCHAR(100), gender TEXT NOT NULL DEFAULT 'UNISEX'
   CHECK(gender IN ('MEN','WOMEN','UNISEX')),
 attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','PUBLISHED','ARCHIVED')),
 version BIGINT NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 published_at TIMESTAMPTZ, archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS catalog_products_category_idx ON catalog_products(category_id,status);
CREATE INDEX IF NOT EXISTS catalog_products_discovery_idx ON catalog_products(status,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS catalog_products_price_idx ON catalog_products(base_price_vnd,id);
CREATE TABLE IF NOT EXISTS catalog_variants(
 id INTEGER PRIMARY KEY,
 product_id INTEGER NOT NULL REFERENCES catalog_products(id),
 sku VARCHAR(100) NOT NULL UNIQUE,
 size VARCHAR(30) NOT NULL,
 color VARCHAR(80) NOT NULL,
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')),
 inventory_sync_status TEXT NOT NULL DEFAULT 'PENDING'
   CHECK(inventory_sync_status IN('PENDING','SYNCED','ERROR')),
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_variant_identity_idx
 ON catalog_variants(product_id,lower(btrim(size)),lower(btrim(color)));
CREATE INDEX IF NOT EXISTS catalog_variants_product_idx ON catalog_variants(product_id);
CREATE TABLE IF NOT EXISTS catalog_product_images(
 id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES catalog_products(id),
 image_url TEXT NOT NULL, provider_id TEXT, alt_text VARCHAR(500),
 sort_order INTEGER NOT NULL DEFAULT 0, is_primary BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_product_primary_image_idx
 ON catalog_product_images(product_id) WHERE is_primary;
CREATE TABLE IF NOT EXISTS catalog_price_history(
 id UUID PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES catalog_products(id),
 old_price_vnd NUMERIC(16,2) NOT NULL, new_price_vnd NUMERIC(16,2) NOT NULL,
 product_version BIGINT NOT NULL, actor_id TEXT, reason VARCHAR(250),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(product_id,product_version)
);
CREATE TABLE IF NOT EXISTS catalog_reviews(
 id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES catalog_products(id),
 user_id INTEGER NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment TEXT CHECK(length(comment)<=3000),
 status TEXT NOT NULL DEFAULT 'VISIBLE' CHECK(status IN('VISIBLE','HIDDEN','PENDING')),
 legacy_unverified BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS catalog_reviews_product_idx
 ON catalog_reviews(product_id,status,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS catalog_inventory_projection(
 variant_id INTEGER PRIMARY KEY REFERENCES catalog_variants(id),
 on_hand_qty INTEGER NOT NULL CHECK(on_hand_qty>=0),
 reserved_qty INTEGER NOT NULL CHECK(reserved_qty>=0 AND reserved_qty<=on_hand_qty),
 available_qty INTEGER NOT NULL CHECK(available_qty>=0),
 stock_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(stock_status IN ('ACTIVE','DISABLED')),
 stock_version BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(available_qty=CASE WHEN stock_status='ACTIVE' THEN on_hand_qty-reserved_qty ELSE 0 END)
);
CREATE TABLE IF NOT EXISTS catalog_inbox(
 message_id UUID PRIMARY KEY,topic TEXT NOT NULL,processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog_outbox(
 id UUID PRIMARY KEY, topic TEXT NOT NULL, envelope JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS catalog_outbox_pending_idx
 ON catalog_outbox(created_at,id) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS catalog_operations(
 operation_key VARCHAR(180) PRIMARY KEY, request_hash CHAR(64) NOT NULL,
 result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog_search_sync_state(
 product_id INTEGER PRIMARY KEY REFERENCES catalog_products(id),
 indexed_version BIGINT NOT NULL DEFAULT 0, indexed_at TIMESTAMPTZ,
 last_error TEXT
);
COMMIT;
