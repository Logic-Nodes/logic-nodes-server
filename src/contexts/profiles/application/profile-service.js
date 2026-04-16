import { query } from "../../../shared/infrastructure/db/postgres.js";
import { httpError } from "../../../shared/application/http-error.js";

const single = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const listProfiles = async () => query(
  `
    SELECT id, first_name AS "firstName", last_name AS "lastName", birth_date AS "birthDate", phone_number AS "phoneNumber",
           document_type AS "documentType", document, user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM profiles
    ORDER BY id DESC
  `
);

export const getProfile = async (id) => single(
  `
    SELECT id, first_name AS "firstName", last_name AS "lastName", birth_date AS "birthDate", phone_number AS "phoneNumber",
           document_type AS "documentType", document, user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM profiles
    WHERE id = $1
    LIMIT 1
  `,
  [id]
);

export const getProfileByUser = async (userId) => single(
  `
    SELECT id, first_name AS "firstName", last_name AS "lastName", birth_date AS "birthDate", phone_number AS "phoneNumber",
           document_type AS "documentType", document, user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM profiles
    WHERE user_id = $1
    LIMIT 1
  `,
  [userId]
);

export const createProfile = async (payload = {}) => {
  const { firstName, lastName, birthDate = null, phoneNumber = null, documentType = null, document = null, userId } = payload;
  if (!firstName || !lastName || !userId) {
    throw httpError("firstName, lastName and userId are required", 400);
  }

  return single(
    `
      INSERT INTO profiles (first_name, last_name, birth_date, phone_number, document_type, document, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name AS "firstName", last_name AS "lastName", birth_date AS "birthDate", phone_number AS "phoneNumber",
                document_type AS "documentType", document, user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [firstName, lastName, birthDate, phoneNumber, documentType, document, userId]
  );
};

export const updateProfile = async (id, payload = {}) => {
  const current = await getProfile(id);
  if (!current) {
    throw httpError("Profile not found", 404);
  }

  const next = {
    firstName: payload.firstName ?? current.firstName,
    lastName: payload.lastName ?? current.lastName,
    birthDate: payload.birthDate ?? current.birthDate,
    phoneNumber: payload.phoneNumber ?? current.phoneNumber,
    documentType: payload.documentType ?? current.documentType,
    document: payload.document ?? current.document,
    userId: payload.userId ?? current.userId
  };

  return single(
    `
      UPDATE profiles
      SET first_name = $2,
          last_name = $3,
          birth_date = $4,
          phone_number = $5,
          document_type = $6,
          document = $7,
          user_id = $8,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, first_name AS "firstName", last_name AS "lastName", birth_date AS "birthDate", phone_number AS "phoneNumber",
                document_type AS "documentType", document, user_id AS "userId", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [id, next.firstName, next.lastName, next.birthDate, next.phoneNumber, next.documentType, next.document, next.userId]
  );
};

export const deleteProfile = async (id) => query(`DELETE FROM profiles WHERE id = $1 RETURNING id`, [id]);
