import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const SUBSCRIPTION_COLUMNS = `
  id,
  user_id AS "userId",
  plan_name AS "planName",
  amount_cents AS "amountCents",
  currency,
  status,
  to_char(renewal_date, 'MM/DD/YYYY') AS "renewalDate",
  payment_method_label AS "paymentMethodLabel",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const PAYMENT_COLUMNS = `
  id,
  user_id AS "userId",
  amount_cents AS "amountCents",
  currency,
  status,
  transaction_id AS "transactionId",
  to_char(paid_at, 'MM/DD/YYYY') AS "date",
  paid_at AS "paidAt"
`;

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const requireUserId = (userId) => {
  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError("A valid userId is required", 400);
  }
  return parsed;
};

const seedPayments = async (userId, amountCents) => {
  // Seed a small payment history so the screen reflects real persisted data.
  await query(
    `
      INSERT INTO payments (user_id, amount_cents, status, transaction_id, paid_at)
      VALUES
        ($1, $2, 'PAID', $3, NOW() - INTERVAL '0 month'),
        ($1, $2, 'PAID', $4, NOW() - INTERVAL '1 month'),
        ($1, $2, 'PAID', $5, NOW() - INTERVAL '2 month')
    `,
    [
      userId,
      amountCents,
      `TXN-${userId}-0001`,
      `TXN-${userId}-0002`,
      `TXN-${userId}-0003`
    ]
  );
};

export const getOrCreateSubscription = async (userId) => {
  const id = requireUserId(userId);

  const existing = await single(
    `SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions WHERE user_id = $1 LIMIT 1`,
    [id]
  );
  if (existing) {
    return existing;
  }

  const created = await single(
    `
      INSERT INTO subscriptions (user_id)
      VALUES ($1)
      RETURNING ${SUBSCRIPTION_COLUMNS}
    `,
    [id]
  );

  await seedPayments(id, created.amountCents);

  return created;
};

export const listPayments = async (userId) => {
  const id = requireUserId(userId);
  // Ensure a subscription (and its seeded history) exists before listing.
  await getOrCreateSubscription(id);

  return query(
    `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE user_id = $1 ORDER BY paid_at DESC`,
    [id]
  );
};

export const linkPaymentMethod = async (userId, payload = {}) => {
  const id = requireUserId(userId);
  await getOrCreateSubscription(id);

  const label = resolvePaymentMethodLabel(payload);

  return single(
    `
      UPDATE subscriptions
      SET payment_method_label = $2,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING ${SUBSCRIPTION_COLUMNS}
    `,
    [id, label]
  );
};

export const cancelSubscription = async (userId) => {
  const id = requireUserId(userId);
  await getOrCreateSubscription(id);

  return single(
    `
      UPDATE subscriptions
      SET status = 'CANCELLED',
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING ${SUBSCRIPTION_COLUMNS}
    `,
    [id]
  );
};

const resolvePaymentMethodLabel = (payload) => {
  if (payload.paymentMethodLabel) {
    return String(payload.paymentMethodLabel).slice(0, 120);
  }

  const digits = String(payload.cardNumber || "").replace(/\D/g, "");
  if (digits.length < 4) {
    throw httpError("A valid card number is required", 400);
  }

  const lastFour = digits.slice(-4);
  return `Card ending in ${lastFour}`;
};
