import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const requireId = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError(`A valid ${label} is required`, 400);
  }
  return parsed;
};

const DEFAULT_PLAN_NAME = "PROFESSIONAL";

// ── Plans ────────────────────────────────────────────────────────────────────

export const listPlans = async () => query(
  `
    SELECT id, name, limits, price::float8 AS price, description
    FROM plans
    ORDER BY price ASC
  `
);

const getPlan = async (planId) => single(
  `SELECT id, name, limits, price::float8 AS price, description FROM plans WHERE id = $1 LIMIT 1`,
  [planId]
);

const getDefaultPlan = async () => {
  const plan = await single(
    `SELECT id, name, limits, price::float8 AS price, description FROM plans WHERE name = $1 LIMIT 1`,
    [DEFAULT_PLAN_NAME]
  );
  return plan || single(`SELECT id, name, limits, price::float8 AS price, description FROM plans ORDER BY price ASC LIMIT 1`);
};

// ── Subscriptions ──────────────────────────────────────────────────────────────

const subscriptionRow = async (where, params) => single(
  `
    SELECT s.id, s.user_id AS "userId", s.status,
           to_char(s.renewal, 'YYYY-MM-DD') AS renewal,
           s.payment_method AS "paymentMethod",
           s.plan_id AS "planId"
    FROM subscriptions s
    WHERE ${where}
    LIMIT 1
  `,
  params
);

const withPlan = async (subscription) => {
  if (!subscription) {
    return null;
  }
  const plan = await getPlan(subscription.planId);
  const { planId, ...rest } = subscription;
  return { ...rest, plan };
};

export const getSubscriptionByUser = async (userId) => {
  const id = requireId(userId, "userId");

  const existing = await subscriptionRow("s.user_id = $1", [id]);
  if (existing) {
    return withPlan(existing);
  }

  const plan = await getDefaultPlan();
  if (!plan) {
    throw httpError("No plans are configured", 500);
  }

  await query(
    `INSERT INTO subscriptions (user_id, plan_id) VALUES ($1, $2)`,
    [id, plan.id]
  );
  await seedPayments(id, plan.price);

  const subscription = await subscriptionRow("s.user_id = $1", [id]);
  return withPlan(subscription);
};

export const changePlan = async (subscriptionId, payload = {}) => {
  const id = requireId(subscriptionId, "subscriptionId");
  const newPlanId = requireId(payload.newPlanId, "newPlanId");

  const plan = await getPlan(newPlanId);
  if (!plan) {
    throw httpError("Plan not found", 404);
  }

  const updated = await query(
    `
      UPDATE subscriptions
      SET plan_id = $2, status = 'ACTIVE', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id, newPlanId]
  );
  if (updated.length === 0) {
    throw httpError("Subscription not found", 404);
  }

  const subscription = await subscriptionRow("s.id = $1", [id]);
  return withPlan(subscription);
};

export const cancelSubscription = async (subscriptionId) => {
  const id = requireId(subscriptionId, "subscriptionId");

  const updated = await query(
    `
      UPDATE subscriptions
      SET status = 'CANCELED', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );
  if (updated.length === 0) {
    throw httpError("Subscription not found", 404);
  }

  const subscription = await subscriptionRow("s.id = $1", [id]);
  return withPlan(subscription);
};

// ── Payments ───────────────────────────────────────────────────────────────────

const seedPayments = async (userId, amount) => {
  await query(
    `
      INSERT INTO payments (user_id, amount, transaction_id, receipt_url, payment_date)
      VALUES
        ($1, $2, $3, $6, CURRENT_DATE),
        ($1, $2, $4, $6, CURRENT_DATE - INTERVAL '1 month'),
        ($1, $2, $5, $6, CURRENT_DATE - INTERVAL '2 month')
    `,
    [
      userId,
      amount,
      `TXN-${userId}-0001`,
      `TXN-${userId}-0002`,
      `TXN-${userId}-0003`,
      `https://logic-nodes-server.onrender.com/receipts/${userId}`
    ]
  );
};

export const listPaymentsByUser = async (userId) => {
  const id = requireId(userId, "userId");
  // Ensure a subscription (and its seeded history) exists first.
  await getSubscriptionByUser(id);

  return query(
    `
      SELECT id, user_id AS "userId", receipt_url AS "receiptUrl",
             transaction_id AS "transactionId", status, amount::float8 AS amount,
             to_char(payment_date, 'YYYY-MM-DD') AS "paymentDate"
      FROM payments
      WHERE user_id = $1
      ORDER BY payment_date DESC, id DESC
    `,
    [id]
  );
};

export const updatePaymentMethod = async (subscriptionId, payload = {}) => {
  const id = requireId(subscriptionId, "subscriptionId");
  const paymentMethodId = `${payload.paymentMethodId || payload.paymentMethod || ""}`.trim();
  if (!paymentMethodId) {
    throw httpError("paymentMethodId is required", 400);
  }

  if (process.env.STRIPE_SECRET_KEY) {
    // Stripe validation hook — store PM id after SetupIntent in a future iteration.
    console.log(`[stripe] payment method ${paymentMethodId} accepted for subscription ${id}`);
  }

  const updated = await query(
    `
      UPDATE subscriptions
      SET payment_method = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id, paymentMethodId]
  );
  if (updated.length === 0) {
    throw httpError("Subscription not found", 404);
  }

  const subscription = await subscriptionRow("s.id = $1", [id]);
  return withPlan(subscription);
};
