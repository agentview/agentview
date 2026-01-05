import { sql } from 'drizzle-orm';
import { db__dangerous } from './db';
import type { Transaction } from './types';

/**
 * Executes a function within a transaction with the organization context set.
 * This enables PostgreSQL RLS policies to filter data by organization.
 *
 * @param organizationId - The organization ID to set as context
 * @param fn - The function to execute within the transaction
 * @returns The result of the function
 *
 * @example
 * ```ts
 * const session = await withOrg(principal.organizationId, async (tx) => {
 *   return tx.query.sessions.findFirst({
 *     where: eq(sessions.id, sessionId),
 *   });
 * });
 * ```
 */
export async function withOrg<T>(
  organizationId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db__dangerous.transaction(async (tx) => {
    // Switch to app_user role to enforce RLS (admin is superuser, bypasses RLS)
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    
    // Set the organization context for RLS policies
    await tx.execute(
      sql`SELECT set_config('app.organization_id', ${organizationId}, true)`
    );
    return fn(tx);
  });
}
