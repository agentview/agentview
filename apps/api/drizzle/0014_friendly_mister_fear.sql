ALTER TABLE "comment_mentions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comment_message_edits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comment_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "end_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inbox_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "starred_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "end_user_external_id_env_unique";--> statement-breakpoint
DROP INDEX "sessions_handle_unique";--> statement-breakpoint
DROP INDEX "version_unique";--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_message_edits" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_messages" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "end_users" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session_items" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "starred_sessions" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_jobs" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_message_edits" ADD CONSTRAINT "comment_message_edits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_messages" ADD CONSTRAINT "comment_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configs" ADD CONSTRAINT "configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_sessions" ADD CONSTRAINT "starred_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_jobs" ADD CONSTRAINT "webhook_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "end_user_external_id_env_org_unique" ON "end_users" USING btree ("external_id","env","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_handle_org_unique" ON "sessions" USING btree ("handle_number","handle_suffix","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "version_org_unique" ON "versions" USING btree ("version","organization_id");--> statement-breakpoint
CREATE POLICY "comment_mentions_tenant_isolation" ON "comment_mentions" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "comment_message_edits_tenant_isolation" ON "comment_message_edits" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "comment_messages_tenant_isolation" ON "comment_messages" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "configs_tenant_isolation" ON "configs" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "emails_tenant_isolation" ON "emails" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "end_users_tenant_isolation" ON "end_users" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "events_tenant_isolation" ON "events" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "inbox_items_tenant_isolation" ON "inbox_items" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "runs_tenant_isolation" ON "runs" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "scores_tenant_isolation" ON "scores" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "session_items_tenant_isolation" ON "session_items" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "sessions_tenant_isolation" ON "sessions" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "starred_sessions_tenant_isolation" ON "starred_sessions" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "versions_tenant_isolation" ON "versions" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE POLICY "webhook_jobs_tenant_isolation" ON "webhook_jobs" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));