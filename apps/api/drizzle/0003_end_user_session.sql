ALTER TABLE "end_user_auth_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "end_user_auth_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "end_users" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_token_unique" UNIQUE("token");