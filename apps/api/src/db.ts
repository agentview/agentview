import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from "./schemas/schema";
import { getDatabaseURL } from './getDatabaseURL';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: getDatabaseURL(),
});


export const db = drizzle({ client: pool }, {
  schema
});