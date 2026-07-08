import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const registerDeviceToken = async (payload = {}) => {
  const userId = Number(payload.userId);
  const token = `${payload.token || ""}`.trim();
  const platform = `${payload.platform || "unknown"}`.trim();

  if (!Number.isInteger(userId) || userId <= 0 || !token) {
    throw httpError("userId and token are required", 400);
  }

  return single(
    `
      INSERT INTO device_tokens (user_id, token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, token)
      DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
      RETURNING id, user_id AS "userId", token, platform, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [userId, token, platform]
  );
};
