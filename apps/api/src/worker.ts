import '@agentview/utils/loadEnv'

import { db } from './db';
import { runs, webhookJobs } from './schemas/schema';
import { eq, and, lt, isNotNull, or, isNull } from 'drizzle-orm';
import { getConfigRow } from './getConfig';

async function processExpiredRuns() {
  try {
    const now = new Date().toISOString();
    
    // Find all runs that are in_progress and have expired
    const expiredRuns = await db
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

    // Update each expired run
    for (const run of expiredRuns) {
      await db
        .update(runs)
        .set({
          expiresAt: null,
          finishedAt: now,
          status: 'failed',
          failReason: { message: 'Timeout' }
        })
        .where(eq(runs.id, run.id));
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
    const configRow = await getConfigRow();
    const webhookUrl = (configRow?.config as any)?.webhookUrl;

    if (!webhookUrl) {
      return; // No webhook URL configured, skip processing
    }

    const now = new Date().toISOString();

    // Find jobs ready to be processed
    const jobs = await db
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
      await processWebhookJob(job, webhookUrl);
    }
  } catch (error) {
    console.error('Error in webhook job processor:', error);
  }
}

async function processWebhookJob(job: typeof webhookJobs.$inferSelect, webhookUrl: string) {
  const now = new Date();

  // Mark as processing
  await db.update(webhookJobs)
    .set({ status: 'processing', updatedAt: now.toISOString() })
    .where(eq(webhookJobs.id, job.id));

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
    await db.update(webhookJobs)
      .set({ status: 'completed', updatedAt: new Date().toISOString() })
      .where(eq(webhookJobs.id, job.id));

    console.log(`Webhook job ${job.id} completed successfully`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.maxAttempts) {
      // Failed permanently
      await db.update(webhookJobs)
        .set({
          status: 'failed',
          attempts: newAttempts,
          lastError: errorMessage,
          updatedAt: new Date().toISOString()
        })
        .where(eq(webhookJobs.id, job.id));

      console.error(`Webhook job ${job.id} failed permanently after ${newAttempts} attempts: ${errorMessage}`);
    } else {
      // Schedule retry with backoff
      const delay = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)];
      const nextAttemptAt = new Date(now.getTime() + delay).toISOString();

      await db.update(webhookJobs)
        .set({
          status: 'pending',
          attempts: newAttempts,
          nextAttemptAt,
          lastError: errorMessage,
          updatedAt: now.toISOString()
        })
        .where(eq(webhookJobs.id, job.id));

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
  processWebhookJobs();
}, 5000);

// Run immediately on startup
processExpiredRuns();
processWebhookJobs();
