import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const sql = fs.readFileSync(path.resolve("db/migrations/001_billing_safe.sql"), "utf8");

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log("Applying billing-safe migration to", process.env.DB_HOST);
  await client.query(sql);
  const plans = await client.query("SELECT id, name, price FROM plans ORDER BY id");
  console.log("Plans:", plans.rows);
} catch (error) {
  console.error("Billing migration failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
