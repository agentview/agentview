import { db__dangerous } from './db';
import { withOrg } from './withOrg';
import { runs, webhookJobs, environments } from './schemas/schema';
import { eq, and, lt, or, isNull, desc } from 'drizzle-orm';
import { getEnvironment } from './environments';
import { initDb } from './initDb';

await initDb();

/**
 * Worker processes run without user context and need to access data across all organizations.
 *
 * Pattern:
 * - Initial queries to find work (expired runs, pending jobs) use db__dangerous for cross-org scans
 * - Once a specific record is found, use withOrg(record.organizationId) for all subsequent operations
 *   to enforce RLS as defense-in-depth
 */

async function processExpiredRuns() {
  try {
    const now = new Date().toISOString();

    // Find all runs that are in_progress and have expired
    const expiredRuns = await db__dangerous
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.status, 'in_progress'),
          lt(runs.expiresAt, now)
        )
      );

    if (expiredRuns.length === 0) {
      return;
    }

    // Update each expired run (using withOrg for RLS enforcement)
    for (const run of expiredRuns) {
      await withOrg(run.organizationId, async (tx) => {
        await tx
          .update(runs)
          .set({
            expiresAt: null,
            finishedAt: now,
            status: 'failed',
            failReason: { message: 'Timeout' }
          })
          .where(eq(runs.id, run.id));
      });
    }

    if (expiredRuns.length > 0) {
      console.log(`Processed ${expiredRuns.length} expired run(s)`);
    }

  } catch (error) {
    console.error('Error processing expired runs:', error);
  }
}

// Webhook job retry delays: 5s, 30s, 2min
const RETRY_DELAYS = [5_000, 30_000, 120_000];

async function processWebhookJobs() {
  try {
    const now = new Date().toISOString();

    // Find jobs ready to be processed (cross-org scan needs db__dangerous)
    const jobs = await db__dangerous
      .select()
      .from(webhookJobs)
      .where(
        and(
          eq(webhookJobs.status, 'pending'),
          or(isNull(webhookJobs.nextAttemptAt), lt(webhookJobs.nextAttemptAt, now))
        )
      )
      .limit(10);

    for (const job of jobs) {
      // const webhookUrl = await withOrg(job.organizationId, async (tx) => {
      //   const configRow = await getConfigRow(tx, null); // Use production config for webhooks
      //   return (configRow?.config as any).webhookUrl;
      // });

      // if (webhookUrl) {
      //   await processWebhookJob(job, webhookUrl);
      // }
    }
  } catch (error) {
    console.error('Error in webhook job processor:', error);
  }
}

async function processWebhookJob(job: typeof webhookJobs.$inferSelect, webhookUrl: string) {
  const now = new Date();

  // Mark as processing (using withOrg for RLS enforcement)
  await withOrg(job.organizationId, async (tx) => {
    await tx.update(webhookJobs)
      .set({ status: 'processing', updatedAt: now.toISOString() })
      .where(eq(webhookJobs.id, job.id));
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: job.eventType,
        payload: job.payload,
        job_id: job.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
    }

    // Success - mark as completed
    await withOrg(job.organizationId, async (tx) => {
      await tx.update(webhookJobs)
        .set({ status: 'completed', updatedAt: new Date().toISOString() })
        .where(eq(webhookJobs.id, job.id));
    });

    console.log(`Webhook job ${job.id} completed successfully`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.maxAttempts) {
      // Failed permanently
      await withOrg(job.organizationId, async (tx) => {
        await tx.update(webhookJobs)
          .set({
            status: 'failed',
            attempts: newAttempts,
            lastError: errorMessage,
            updatedAt: new Date().toISOString()
          })
          .where(eq(webhookJobs.id, job.id));
      });

      console.error(`Webhook job ${job.id} failed permanently after ${newAttempts} attempts: ${errorMessage}`);
    } else {
      // Schedule retry with backoff
      const delay = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)];
      const nextAttemptAt = new Date(now.getTime() + delay).toISOString();

      await withOrg(job.organizationId, async (tx) => {
        await tx.update(webhookJobs)
          .set({
            status: 'pending',
            attempts: newAttempts,
            nextAttemptAt,
            lastError: errorMessage,
            updatedAt: now.toISOString()
          })
          .where(eq(webhookJobs.id, job.id));
      });

      console.log(`Webhook job ${job.id} failed, scheduling retry ${newAttempts}/${job.maxAttempts} at ${nextAttemptAt}`);
    }
  }
}

// Run expired runs processor every second
setInterval(() => {
  processExpiredRuns();
}, 1000);

// Run webhook job processor every 5 seconds
setInterval(() => {
  // processWebhookJobs();
}, 5000);

// Run immediately on startup
processExpiredRuns();
// processWebhookJobs();
