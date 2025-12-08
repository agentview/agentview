DROP INDEX "end_user_external_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "end_user_external_id_env_unique" ON "end_users" USING btree ("external_id","env");