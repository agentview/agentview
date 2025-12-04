import 'dotenv/config';
import { db } from './db';
import { runs } from './schemas/schema';
import { eq, and, lt, isNotNull } from 'drizzle-orm';

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

// Run every 5 seconds
setInterval(() => {
  processExpiredRuns();
}, 5000);

// Run immediately on startup
processExpiredRuns();
