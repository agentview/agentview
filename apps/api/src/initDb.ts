import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db__dangerous } from './db';
import { sql } from 'drizzle-orm';

export async function initDb() {
    console.log("Initializing db...");

    await migrate(db__dangerous, { migrationsFolder: './drizzle' });
    console.log("✅ Database migrated successfully");

    // Create app_user and grant privileges to app_user for RLS enforcement
    await db__dangerous.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
            CREATE ROLE app_user NOINHERIT NOLOGIN;
          END IF;
        END
        $$
      `);

    // Schema usage is needed because db:clear recreates the public schema
    await db__dangerous.execute(sql`GRANT USAGE ON SCHEMA public TO app_user`);
    await db__dangerous.execute(sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`);
    await db__dangerous.execute(sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`);
    console.log("✅ Granted privileges to app_user");
}