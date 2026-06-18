-- Billing context: plans, subscriptions and payment history.
-- Matches the web/mobile contract (Plan / Subscription / Payment).

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;

CREATE TABLE plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  limits VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  renewal DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  payment_method VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receipt_url VARCHAR(500) NOT NULL DEFAULT '',
  transaction_id VARCHAR(60) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

INSERT INTO plans (name, limits, price, description) VALUES
  ('BASIC', 'Up to 5 vehicles', 29.00, 'Essential tracking for small fleets.'),
  ('PROFESSIONAL', 'Up to 25 vehicles', 79.00, 'Advanced monitoring, alerts and reports.'),
  ('ENTERPRISE', 'Unlimited vehicles', 199.00, 'Full platform with priority support and SLAs.')
ON CONFLICT DO NOTHING;
