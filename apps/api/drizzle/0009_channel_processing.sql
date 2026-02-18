-- Add routing columns to channels
ALTER TABLE "channels" ADD COLUMN "environment_id" uuid;
ALTER TABLE "channels" ADD COLUMN "agent" varchar(255);
ALTER TABLE "channels" ADD CONSTRAINT "channels_environment_id_environments_id_fk"
  FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE set null ON UPDATE no action;

-- Add channel linkage columns to sessions
ALTER TABLE "sessions" ADD COLUMN "channel_id" uuid;
ALTER TABLE "sessions" ADD COLUMN "channel_thread_id" varchar(255);
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_channel_id_channels_id_fk"
  FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "sessions_channel_thread_idx" ON "sessions" USING btree ("channel_id", "channel_thread_id");
