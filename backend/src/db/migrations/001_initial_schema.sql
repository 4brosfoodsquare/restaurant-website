-- ---------------------------------------------------------------------------
-- 001 — Core schema
--
-- Money is stored in integer minor units (paise) to avoid floating point
-- rounding errors on order totals. Never store currency as REAL.
-- Timestamps are ISO-8601 UTC strings ("2026-01-31T09:15:00.000Z").
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL,
  email_norm    TEXT NOT NULL UNIQUE,          -- lowercased, used for lookups
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_users_role ON users(role_id);

-- Refresh tokens are stored hashed so a database leak cannot be replayed.
CREATE TABLE refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens(expires_at);

CREATE TABLE categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  image_url    TEXT,
  is_signature INTEGER NOT NULL DEFAULT 0 CHECK (is_signature IN (0, 1)),
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order);

CREATE TABLE menu_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  -- Authoritative price in minor units. The frontend never decides this.
  price_minor   INTEGER NOT NULL CHECK (price_minor >= 0),
  image_url     TEXT,
  diet_type     TEXT NOT NULL DEFAULT 'unspecified'
                  CHECK (diet_type IN ('veg', 'non_veg', 'egg', 'unspecified')),
  spice_level   INTEGER NOT NULL DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 3),
  is_available  INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_featured   INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_popular    INTEGER NOT NULL DEFAULT 0 CHECK (is_popular IN (0, 1)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_listing ON menu_items(is_active, is_available, sort_order);

CREATE TABLE orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Human-facing reference shown to the customer, e.g. "FB-7GK4QP".
  reference          TEXT NOT NULL UNIQUE,
  -- Unguessable token so a guest can track their order without an account.
  tracking_token     TEXT NOT NULL UNIQUE,
  -- Client-supplied idempotency key; makes double submits safe.
  idempotency_key    TEXT UNIQUE,

  customer_name      TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  customer_email     TEXT,

  order_type         TEXT NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
  address_line1      TEXT,
  address_line2      TEXT,
  address_city       TEXT,
  address_postcode   TEXT,
  address_notes      TEXT,
  scheduled_for      TEXT,
  customer_notes     TEXT NOT NULL DEFAULT '',

  -- Snapshot of every amount at the moment the order was placed.
  currency           TEXT NOT NULL DEFAULT 'INR',
  subtotal_minor     INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  tax_minor          INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  tax_rate_bps       INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps >= 0),
  delivery_fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_minor >= 0),
  discount_minor     INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor        INTEGER NOT NULL CHECK (total_minor >= 0),

  status             TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  cancellation_reason TEXT,

  -- Payment stays "unpaid / pay on collection" until an online provider is
  -- wired up. The payments table below carries provider detail.
  payment_method     TEXT NOT NULL DEFAULT 'pay_on_collection'
                       CHECK (payment_method IN ('pay_on_collection', 'online')),
  payment_status     TEXT NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),

  placed_by_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Order lines keep their own copy of name/price so editing the menu later can
-- never rewrite history. menu_item_id is a soft reference for reporting only.
CREATE TABLE order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id      INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  name_snapshot     TEXT NOT NULL,
  category_snapshot TEXT NOT NULL DEFAULT '',
  diet_snapshot     TEXT NOT NULL DEFAULT 'unspecified',
  unit_price_minor  INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  line_total_minor  INTEGER NOT NULL CHECK (line_total_minor >= 0),
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_status_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  changed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at);

-- Reserved for the future online-payment integration. No provider is wired up
-- in this release; the table exists so payments can be added without a
-- destructive migration of the orders table.
CREATE TABLE payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  provider_ref    TEXT,
  amount_minor    INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded')),
  failure_reason  TEXT,
  refunded_minor  INTEGER NOT NULL DEFAULT 0 CHECK (refunded_minor >= 0),
  raw_payload     TEXT,
  paid_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE UNIQUE INDEX idx_payments_provider_ref ON payments(provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

-- Single-row-per-key restaurant configuration, editable from the admin UI.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);

INSERT INTO roles (key, label, description) VALUES
  ('owner', 'Owner', 'Full access to every part of the dashboard, including staff and settings.'),
  ('admin', 'Manager', 'Manages orders, menu, categories and settings. Cannot manage staff accounts.'),
  ('staff', 'Kitchen / counter staff', 'Views and progresses orders, and toggles item availability.');
