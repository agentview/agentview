import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from "./schemas/schema";
import { getDatabaseURL } from './getDatabaseURL';

/**
 * DANGEROUS: Direct database access without RLS organization context.
 *
 * This bypasses Row Level Security policies! Only use for:
 * 1. Auth-related tables (users, members, organizations, etc.) that don't have RLS
 * 2. Migrations and admin operations
 * 3. Inside withOrg() which sets the organization context
 *
 * For all other operations, use withOrg() to ensure proper tenant isolation.
 */
export const db__dangerous = drizzle(getDatabaseURL(), {
  schema
});
