CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0)
);
CREATE TABLE IF NOT EXISTS cart_items (
  user_id TEXT NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  added_price_cents INTEGER NOT NULL CHECK(added_price_cents >= 0),
  PRIMARY KEY(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  cart_revision INTEGER NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed' CHECK(status = 'placed'),
  total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, cart_revision)
);
CREATE INDEX IF NOT EXISTS orders_owner_date ON orders(user_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents >= 0),
  subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents >= 0),
  PRIMARY KEY(order_id, product_id)
);
CREATE TABLE IF NOT EXISTS order_requests (
  user_id TEXT NOT NULL REFERENCES users(id),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, idempotency_key)
);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(2, unixepoch());
