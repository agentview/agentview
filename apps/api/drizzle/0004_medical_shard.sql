ALTER TABLE "runs" ADD COLUMN "fetch_status" varchar(24);--> statement-breakpoint
CREATE INDEX "runs_fetch_status_idx" ON "runs" USING btree ("fetch_status");