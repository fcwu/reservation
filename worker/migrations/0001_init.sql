-- customers: identified by phone number
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  line_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- services: what the studio offers
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- slot_rules: weekly recurring availability rules
CREATE TABLE IF NOT EXISTS slot_rules (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL,   -- HH:MM
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- slot_overrides: close a specific date from recurring rules
CREATE TABLE IF NOT EXISTS slot_overrides (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  is_closed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- slots: one-time manually created slots
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  start_at TEXT NOT NULL, -- ISO8601
  end_at TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  source_rule_id TEXT REFERENCES slot_rules(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- reservations
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES slots(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  note TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_slot_id ON reservations(slot_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
