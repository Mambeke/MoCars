CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  item_id TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  listing_reference TEXT NOT NULL DEFAULT '',
  preferred_date TEXT NOT NULL DEFAULT '',
  preferred_time TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_listing_reference_idx ON enquiries(listing_reference);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  city TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_email_idx ON orders(customer_email);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS inventory_listings (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('vehicle', 'part')),
  reference TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS inventory_listings_type_status_idx ON inventory_listings(item_type, status);
CREATE INDEX IF NOT EXISTS inventory_listings_updated_at_idx ON inventory_listings(updated_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS media_assets_created_at_idx ON media_assets(created_at DESC);
