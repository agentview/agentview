CREATE TABLE "webhook_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"session_id" uuid,
	"status" varchar(64) NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 3 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "webhook_jobs" ADD CONSTRAINT "webhook_jobs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_jobs_status_next_attempt_idx" ON "webhook_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhook_jobs_session_id_idx" ON "webhook_jobs" USING btree ("session_id");