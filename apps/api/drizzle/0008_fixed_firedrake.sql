ALTER TABLE "end_users" ADD COLUMN "env" varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE "end_users" DROP COLUMN "is_shared";