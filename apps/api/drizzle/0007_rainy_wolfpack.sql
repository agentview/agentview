DROP INDEX "version_env_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "version_unique" ON "versions" USING btree ("version");--> statement-breakpoint
ALTER TABLE "versions" DROP COLUMN "env";--> statement-breakpoint
ALTER TABLE "versions" DROP COLUMN "metadata";