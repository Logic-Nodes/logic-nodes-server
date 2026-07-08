import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const root = process.cwd();
const files = [
  "db/schema.sql",
  "db/migrations/001_billing_safe.sql",
  "db/migrations/003_platform_features.sql"
];

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
  console.log("Connected to", process.env.DB_HOST);

  for (const file of files) {
    const absolutePath = path.resolve(root, file);
    const sql = fs.readFileSync(absolutePath, "utf8");
    console.log("Running", file, "...");
    await client.query(sql);
    console.log("OK:", file);
  }

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Tables:", tables.rows.map((row) => row.table_name).join(", "));
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
