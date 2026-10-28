// Runs db/schema.sql against the Supabase project (via Management API).
// Usage: node scripts/setup-db.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REF = "mjzhhfoqrlvpimpyrvoe";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("Set SUPABASE_ACCESS_TOKEN (the sbp_... token) first.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
// Usage: node scripts/setup-db.mjs [path-to-sql]   (default: db/schema.sql)
const sqlPath = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(here, "..", "db", "schema.sql");
const sql = readFileSync(sqlPath, "utf8");
console.log(`Running: ${sqlPath}`);

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);

if (!res.ok) process.exit(1);
console.log("✅ Database schema created/updated.");
