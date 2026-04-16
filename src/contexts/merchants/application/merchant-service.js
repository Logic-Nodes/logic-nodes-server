import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const listMerchants = async () => query(
  `
    SELECT id, name, contact_email AS "contactEmail", fiscal_address AS "fiscalAddress", ruc, is_active AS "isActive",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM merchants
    ORDER BY id DESC
  `
);

export const getMerchant = async (id) => single(
  `SELECT id, name, contact_email AS "contactEmail", fiscal_address AS "fiscalAddress", ruc, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM merchants WHERE id = $1 LIMIT 1`,
  [id]
);

export const createMerchant = async (payload = {}) => {
  const { name, contactEmail, fiscalAddress, ruc, isActive = true } = payload;
  if (!name || !contactEmail || !fiscalAddress || !ruc) {
    throw httpError("name, contactEmail, fiscalAddress and ruc are required", 400);
  }

  return single(
    `
      INSERT INTO merchants (name, contact_email, fiscal_address, ruc, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, contact_email AS "contactEmail", fiscal_address AS "fiscalAddress", ruc, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [name, contactEmail, fiscalAddress, ruc, Boolean(isActive)]
  );
};

export const addEmployee = async (merchantId, userId) => {
  const merchant = await getMerchant(merchantId);
  if (!merchant) {
    throw httpError("Merchant not found", 404);
  }

  const employee = await single(
    `
      INSERT INTO employees (merchant_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (merchant_id, user_id) DO UPDATE SET updated_at = NOW()
      RETURNING id, merchant_id AS "merchantId", user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [merchantId, userId]
  );

  return employee;
};

export const updateMerchant = async (id, payload = {}) => {
  const current = await getMerchant(id);
  if (!current) {
    throw httpError("Merchant not found", 404);
  }

  const next = {
    name: payload.name ?? current.name,
    contactEmail: payload.contactEmail ?? current.contactEmail,
    fiscalAddress: payload.fiscalAddress ?? current.fiscalAddress,
    ruc: payload.ruc ?? current.ruc,
    isActive: payload.isActive ?? current.isActive
  };

  return single(
    `
      UPDATE merchants
      SET name = $2,
          contact_email = $3,
          fiscal_address = $4,
          ruc = $5,
          is_active = $6,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, contact_email AS "contactEmail", fiscal_address AS "fiscalAddress", ruc, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, next.name, next.contactEmail, next.fiscalAddress, next.ruc, Boolean(next.isActive)]
  );
};

export const deleteMerchant = async (id) => query(`DELETE FROM merchants WHERE id = $1 RETURNING id`, [id]);

export const listEmployees = async () => query(
  `
    SELECT e.id, e.merchant_id AS "merchantId", e.user_id AS "userId", e.created_at AS "createdAt", e.updated_at AS "updatedAt",
           m.name AS "merchantName", u.email AS "userEmail"
    FROM employees e
    JOIN merchants m ON m.id = e.merchant_id
    JOIN users u ON u.id = e.user_id
    ORDER BY e.id DESC
  `
);

export const listEmployeesByMerchant = async (merchantId) => query(
  `
    SELECT e.id, e.merchant_id AS "merchantId", e.user_id AS "userId", e.created_at AS "createdAt", e.updated_at AS "updatedAt",
           u.email AS "userEmail"
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.merchant_id = $1
    ORDER BY e.id DESC
  `,
  [merchantId]
);

export const getEmployee = async (id) => single(
  `
    SELECT e.id, e.merchant_id AS "merchantId", e.user_id AS "userId", e.created_at AS "createdAt", e.updated_at AS "updatedAt",
           m.name AS "merchantName", u.email AS "userEmail"
    FROM employees e
    JOIN merchants m ON m.id = e.merchant_id
    JOIN users u ON u.id = e.user_id
    WHERE e.id = $1
    LIMIT 1
  `,
  [id]
);

export const deleteEmployee = async (id) => query(`DELETE FROM employees WHERE id = $1 RETURNING id`, [id]);
