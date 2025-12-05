ALTER TABLE "end_users" RENAME COLUMN "simulated_by" TO "created_by";--> statement-breakpoint
ALTER TABLE "end_users" DROP CONSTRAINT "end_users_simulated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;