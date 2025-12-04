ALTER TABLE "runs" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "runs_expires_at_status_idx" ON "runs" USING btree ("expires_at","status");