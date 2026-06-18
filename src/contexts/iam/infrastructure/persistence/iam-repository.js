import crypto from "crypto";

import bcrypt from "bcryptjs";

import { query } from "../../../../shared/infrastructure/db/postgres.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const listUsers = async () => {
  const rows = await query(
    `
      SELECT u.id, u.email, u.created_at AS "createdAt", u.updated_at AS "updatedAt",
             COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `
  );

  return rows;
};

export const getUserById = async (userId) => {
  const rows = await query(
    `
      SELECT u.id, u.email, u.password, u.created_at AS "createdAt", u.updated_at AS "updatedAt",
             COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1
      GROUP BY u.id
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

export const getUserByEmail = async (email) => {
  const rows = await query(
    `
      SELECT u.id, u.email, u.password, u.created_at AS "createdAt", u.updated_at AS "updatedAt",
             COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE lower(u.email) = $1
      GROUP BY u.id
      LIMIT 1
    `,
    [normalizeEmail(email)]
  );

  return rows[0] || null;
};

export const listRoles = async () => {
  return query(
    `
      SELECT id, name
      FROM roles
      ORDER BY id ASC
    `
  );
};

export const getRoleByName = async (name) => {
  const rows = await query(
    `
      SELECT id, name
      FROM roles
      WHERE lower(name) = lower($1)
      LIMIT 1
    `,
    [name]
  );

  return rows[0] || null;
};

export const createRoleIfMissing = async (name) => {
  const existing = await getRoleByName(name);
  if (existing) {
    return existing;
  }

  const rows = await query(
    `
      INSERT INTO roles (name)
      VALUES ($1)
      RETURNING id, name
    `,
    [name]
  );

  return rows[0];
};

export const createUser = async ({ email, password, roles = ["USER"] }) => {
  const normalizedEmail = normalizeEmail(email);
  const hashedPassword = await bcrypt.hash(password, 10);

  const createdUsers = await query(
    `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [normalizedEmail, hashedPassword]
  );

  const user = createdUsers[0];

  const roleRows = [];
  for (const roleName of roles) {
    const role = await createRoleIfMissing(roleName);
    await query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [user.id, role.id]
    );
    roleRows.push(role.name);
  }

  return {
    ...user,
    roles: roleRows
  };
};

export const verifyPassword = async (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);

export const updateUserPassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const rows = await query(
    `
      UPDATE users
      SET password = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email
    `,
    [userId, hashedPassword]
  );

  return rows[0] || null;
};

export const createRefreshToken = async ({ userId, jti, expiresAt }) => {
  return query(
    `
      INSERT INTO user_refresh_tokens (user_id, jti_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id AS "userId", jti_hash AS "jtiHash", expires_at AS "expiresAt", revoked
    `,
    [userId, hashToken(jti), expiresAt]
  ).then((rows) => rows[0]);
};

export const revokeRefreshToken = async (jti) => {
  return query(
    `
      UPDATE user_refresh_tokens
      SET revoked = TRUE
      WHERE jti_hash = $1
      RETURNING id
    `,
    [hashToken(jti)]
  );
};

export const revokeAllRefreshTokensForUser = async (userId) => {
  return query(
    `
      UPDATE user_refresh_tokens
      SET revoked = TRUE
      WHERE user_id = $1
      RETURNING id
    `,
    [userId]
  );
};

export const isRefreshTokenRevoked = async (jti) => {
  const rows = await query(
    `
      SELECT revoked
      FROM user_refresh_tokens
      WHERE jti_hash = $1
      LIMIT 1
    `,
    [hashToken(jti)]
  );

  return rows[0]?.revoked || false;
};