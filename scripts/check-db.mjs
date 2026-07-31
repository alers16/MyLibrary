import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const tables = await sql`
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1
`;
console.log("TABLES:", tables.map((t) => t.table_name).join(", ") || "(none)");

if (tables.some((t) => t.table_name === "user")) {
  const users = await sql`SELECT id, email, name FROM "user"`;
  console.log("USERS:", JSON.stringify(users, null, 2));
}
if (tables.some((t) => t.table_name === "books")) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM books`;
  console.log("BOOKS COUNT:", count);
}
