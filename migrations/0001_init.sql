-- Relay schema and seed data (Cloudflare D1 / SQLite).

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL CHECK (kind IN ('member', 'guest', 'demo')),
  email         TEXT UNIQUE,
  name          TEXT,
  password_hash TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_users_kind_created ON users (kind, created_at);

-- Fictional advertisers. Bids are USD per 1,000 impressions; base_ctr is the
-- click-through rate each campaign normally gets.
CREATE TABLE campaigns (
  id         TEXT PRIMARY KEY,
  advertiser TEXT NOT NULL,
  headline   TEXT NOT NULL,
  segment    TEXT NOT NULL,
  bid_cpm    REAL NOT NULL,
  base_ctr   REAL NOT NULL,
  geos       TEXT NOT NULL -- 'all' or a JSON array of country codes
);

CREATE TABLE deliveries (
  id                 TEXT PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  request_json       TEXT NOT NULL,
  auction_json       TEXT NOT NULL,
  filled             INTEGER NOT NULL,
  clearing_price_cpm REAL NOT NULL,
  server_ms          INTEGER NOT NULL,
  created_at         TEXT NOT NULL
);

CREATE INDEX idx_deliveries_user_created ON deliveries (user_id, created_at DESC);

INSERT INTO campaigns (id, advertiser, headline, segment, bid_cpm, base_ctr, geos) VALUES
  ('cmp_nova',     'Nova Cloud',    'Ship serverless in one command',          'tech',     4.20, 0.024, 'all'),
  ('cmp_helix',    'Helix Gaming',  'Play the open beta tonight',              'gaming',   3.80, 0.041, 'all'),
  ('cmp_lumen',    'Lumen Finance', '0% APR for your first 18 months',         'finance',  6.80, 0.011, '["US","UK","CA"]'),
  ('cmp_pulse',    'PulseFit',      'A running coach in your pocket',          'fitness',  3.10, 0.018, 'all'),
  ('cmp_drift',    'Drift Travel',  'Last-minute escapes, up to 40% off',      'travel',   2.90, 0.020, 'all'),
  ('cmp_bytemart', 'Bytemart',      'Black Friday came early, shop now',       'shopping', 5.50, 0.032, '["US","UK","CA","DE","AU","BR","IN"]');

-- Shared demo account: demo@relay.dev / demo1234 (PBKDF2-SHA256, 100,000 iterations).
INSERT INTO users (kind, email, name, password_hash, created_at) VALUES
  ('demo', 'demo@relay.dev', 'Demo account',
   'pbkdf2$100000$giWeyQiXoPqOWxm6fcCOpw$YeqHdRdIOwu0YLooAtvXCaYdNWUHvwRm2yRrNlkZ-Zw',
   '2026-11-07T00:00:00.000Z');
