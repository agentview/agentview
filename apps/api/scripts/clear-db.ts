import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

console.log("Dropping all existing tables...");

await db.execute(sql`
  DROP SCHEMA IF EXISTS public CASCADE;
  DROP SCHEMA IF EXISTS drizzle CASCADE;
  CREATE SCHEMA public;
`);

// Get all table names from the database
// const tablesQuery = await db.execute(`
//   SELECT tablename 
//   FROM pg_tables 
//   WHERE schemaname = 'public' 
//   AND tablename NOT LIKE 'pg_%' 
//   AND tablename != 'information_schema'
// `);

// const tableNames = tablesQuery.rows.map((row: any) => row.tablename);

// if (tableNames.length > 0) {
//   console.log(`Found ${tableNames.length} tables to drop: ${tableNames.join(", ")}`);
  
//   // Drop all tables with CASCADE to handle foreign key constraints
//   for (const tableName of tableNames) {
//     await db.execute(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
//     console.log(`  ✓ Dropped table: ${tableName}`);
//   }
// } else {
//   console.log("  ✓ No existing tables found");
// }

console.log("  ✓ Database dropped successfully");

await db.$client.end();
console.log("  ✓ Database connection closed");