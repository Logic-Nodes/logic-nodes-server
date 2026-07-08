import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const files = ["db/schema.sql", "db/billing.sql"];

try {
  await client.connect();
  console.log("Connected to", process.env.DB_HOST);

  for (const file of files) {
    const sql = fs.readFileSync(path.resolve(file), "utf8");
    console.log("Running", file, "...");
    await client.query(sql);
    console.log("OK:", file);
  }

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Tables created:", tables.rows.map((r) => r.table_name).join(", "));
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
