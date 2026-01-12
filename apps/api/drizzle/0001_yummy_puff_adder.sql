ALTER TABLE "end_users" RENAME COLUMN "env" TO "space";--> statement-breakpoint
DROP INDEX "end_user_external_id_env_org_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "end_user_external_id_space_org_unique" ON "end_users" USING btree ("external_id","space","organization_id");