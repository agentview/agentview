ALTER TABLE "configs" RENAME TO "environments";--> statement-breakpoint
ALTER TABLE "environments" DROP CONSTRAINT "configs_org_user_unique";--> statement-breakpoint
ALTER TABLE "environments" DROP CONSTRAINT "configs_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "environments" DROP CONSTRAINT "configs_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "end_user_external_id_space_org_unique";--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "end_user_external_id_org_unique" ON "end_users" USING btree ("external_id","organization_id");--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_org_user_unique" UNIQUE NULLS NOT DISTINCT("organization_id","user_id");--> statement-breakpoint
ALTER POLICY "configs_tenant_isolation" ON "environments" RENAME TO "environments_tenant_isolation";