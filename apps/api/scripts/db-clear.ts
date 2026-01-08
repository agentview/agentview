import { db__dangerous } from "../src/db";
import { sql } from "drizzle-orm";

console.log("Dropping all existing tables...");

await db__dangerous.execute(sql`
  DROP SCHEMA IF EXISTS public CASCADE;
  DROP SCHEMA IF EXISTS drizzle CASCADE;
  CREATE SCHEMA public;
`);

console.log("  ✓ Database dropped successfully");

await db__dangerous.$client.end();
console.log("  ✓ Database connection closed");