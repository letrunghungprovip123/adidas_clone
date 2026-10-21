BEGIN;
CREATE TABLE IF NOT EXISTS customer_profiles(
 customer_id INTEGER PRIMARY KEY CHECK(customer_id>0),
 display_name VARCHAR(100),avatar_url TEXT,phone VARCHAR(20),
 status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','SUSPENDED','DELETED')),
 version BIGINT NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_addresses(
 id INTEGER PRIMARY KEY CHECK(id>0),
 customer_id INTEGER NOT NULL REFERENCES customer_profiles(customer_id),
 receiver_name VARCHAR(100) NOT NULL,phone VARCHAR(20) NOT NULL,
 address_line VARCHAR(500) NOT NULL,city VARCHAR(100) NOT NULL,district VARCHAR(100) NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT false,deleted_at TIMESTAMPTZ,
 version BIGINT NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default
 ON customer_addresses(customer_id) WHERE is_default AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customer_addresses_owner ON customer_addresses(customer_id,id) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS customer_wishlists(
 customer_id INTEGER NOT NULL REFERENCES customer_profiles(customer_id),
 product_id INTEGER NOT NULL CHECK(product_id>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,product_id)
);
CREATE INDEX IF NOT EXISTS customer_wishlists_page ON customer_wishlists(customer_id,created_at DESC,product_id);
CREATE TABLE IF NOT EXISTS loyalty_wallets(
 customer_id INTEGER PRIMARY KEY REFERENCES customer_profiles(customer_id),
 posted_points BIGINT NOT NULL DEFAULT 0 CHECK(posted_points>=0),
 reserved_points BIGINT NOT NULL DEFAULT 0 CHECK(reserved_points>=0 AND reserved_points<=posted_points),
 version BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS loyalty_holds(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id INTEGER NOT NULL REFERENCES loyalty_wallets(customer_id),
 checkout_ref VARCHAR(180) NOT NULL UNIQUE,
 idempotency_key VARCHAR(180) NOT NULL UNIQUE,
 request_hash CHAR(64) NOT NULL,
 points BIGINT NOT NULL CHECK(points>0),
 status TEXT NOT NULL CHECK(status IN('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 finalized_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS loyalty_holds_expiry ON loyalty_holds(expires_at,id) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS loyalty_holds_customer ON loyalty_holds(customer_id,created_at DESC);
CREATE TABLE IF NOT EXISTS loyalty_ledger(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id INTEGER NOT NULL REFERENCES loyalty_wallets(customer_id),
 entry_kind TEXT NOT NULL CHECK(entry_kind IN('OPENING','EARN','REDEEM','REVERSAL','ADJUSTMENT')),
 delta_points BIGINT NOT NULL CHECK(delta_points<>0),
 source_type TEXT NOT NULL CHECK(source_type IN('MIGRATION','ORDER','REFUND','ADMIN')),
 source_ref VARCHAR(180) NOT NULL,
 related_entry_id UUID REFERENCES loyalty_ledger(id),
 reason VARCHAR(250),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(source_type,source_ref,entry_kind)
);
CREATE INDEX IF NOT EXISTS loyalty_ledger_history ON loyalty_ledger(customer_id,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS customer_operations(
 operation_key VARCHAR(180) PRIMARY KEY,request_hash CHAR(64) NOT NULL,
 result JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_outbox(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),topic VARCHAR(180) NOT NULL,
 envelope JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS customer_outbox_pending ON customer_outbox(created_at,id) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS customer_inbox(
 message_id UUID PRIMARY KEY,topic VARCHAR(180) NOT NULL,processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_seed_loyalty_rows(
 source_id INTEGER PRIMARY KEY,customer_id INTEGER NOT NULL REFERENCES customer_profiles(customer_id),
 points BIGINT NOT NULL,source_updated_at TIMESTAMPTZ
);
COMMIT;
