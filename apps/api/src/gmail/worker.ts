import { lt } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db__dangerous } from '../db';
import { withOrg } from '../withOrg';
import { gmailConnections } from '../schemas/schema';
import { setupWatch } from './api';

export async function processGmailWatchRenewals() {
  try {
    // Renew watches that expire within the next day
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const expiring = await db__dangerous
      .select()
      .from(gmailConnections)
      .where(lt(gmailConnections.watchExpiresAt, oneDayFromNow));

    for (const connection of expiring) {
      try {
        const onTokenRefresh = async (tokens: { access_token: string; expiry_date: number | null }) => {
          await withOrg(connection.organizationId, async (tx) => {
            await tx.update(gmailConnections).set({
              accessToken: tokens.access_token,
              tokenExpiresAt: tokens.expiry_date
                ? new Date(tokens.expiry_date).toISOString()
                : null,
              updatedAt: new Date().toISOString(),
            }).where(eq(gmailConnections.id, connection.id));
          });
        };

        const watch = await setupWatch(
          connection.accessToken,
          connection.refreshToken,
          onTokenRefresh,
        );

        await withOrg(connection.organizationId, async (tx) => {
          await tx.update(gmailConnections).set({
            historyId: watch.historyId,
            watchExpiresAt: watch.expiration,
            updatedAt: new Date().toISOString(),
          }).where(eq(gmailConnections.id, connection.id));
        });

        console.log(`[gmail] Renewed watch for ${connection.emailAddress}`);
      } catch (error) {
        console.error(`[gmail] Failed to renew watch for ${connection.emailAddress}:`, error);
      }
    }
  } catch (error) {
    console.error('[gmail] Error in watch renewal processor:', error);
  }
}
