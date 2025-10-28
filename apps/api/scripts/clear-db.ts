import "dotenv/config";
import { db, pool } from "../src/db";

console.log("Dropping all existing tables...");

// Get all table names from the database
const tablesQuery = await db.execute(`
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%' 
  AND tablename != 'information_schema'
`);

const tableNames = tablesQuery.rows.map((row: any) => row.tablename);

if (tableNames.length > 0) {
  console.log(`Found ${tableNames.length} tables to drop: ${tableNames.join(", ")}`);
  
  // Drop all tables with CASCADE to handle foreign key constraints
  for (const tableName of tableNames) {
    await db.execute(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    console.log(`  ✓ Dropped table: ${tableName}`);
  }
} else {
  console.log("  ✓ No existing tables found");
}

console.log("  ✓ Database dropped successfully");

await pool.end();
console.log("  ✓ Database connection closed");