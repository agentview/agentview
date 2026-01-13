ALTER TABLE "configs" DROP CONSTRAINT "configs_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "configs" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_created_by_space_check" CHECK ((space = 'production' AND created_by IS NULL) OR (space != 'production' AND created_by IS NOT NULL));