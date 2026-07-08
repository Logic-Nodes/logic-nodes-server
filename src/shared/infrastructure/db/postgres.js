import pg from "pg";
import { env } from "../../config/env.js";

const { Pool } = pg;

const useSsl = env.db.host.includes("render.com");

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ...(useSsl && { ssl: { rejectUnauthorized: false } })
});

export const query = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result.rows;
};
