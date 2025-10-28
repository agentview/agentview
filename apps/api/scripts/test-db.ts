import "dotenv/config";
import { db, pool } from "../src/db";

console.log("Running 'select 1' test SQL query");

try {
    const result = await db.execute('select 1');
    console.log("✅ Success!");
    
    console.log("Closing database connection...");
    
    await pool.end();
    
    console.log("Database connection closed");
    
} catch (error) {
    console.error("❌ Error!")
    throw error;
}