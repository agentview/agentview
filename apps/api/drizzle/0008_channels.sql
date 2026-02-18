DROP TABLE IF EXISTS "gmail_connections";--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"name" varchar(255),
	"address" varchar(255) NOT NULL,
	"status" varchar(64) DEFAULT 'active' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_org_type_address_unique" UNIQUE("organization_id","type","address")
);
--> statement-breakpoint
CREATE INDEX "channels_address_idx" ON "channels" USING btree ("address");--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "channels_tenant_isolation" ON "channels" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));--> statement-breakpoint
CREATE TABLE "channel_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"channel_id" uuid NOT NULL,
	"direction" varchar(16) NOT NULL,
	"contact" varchar(255) NOT NULL,
	"thread_id" varchar(255),
	"source_id" varchar(255),
	"text" text,
	"attachments" jsonb,
	"provider_data" jsonb,
	"status" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_messages_channel_source_unique" ON "channel_messages" USING btree ("channel_id","source_id");--> statement-breakpoint
CREATE INDEX "channel_messages_channel_id_idx" ON "channel_messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "channel_messages_contact_idx" ON "channel_messages" USING btree ("contact");--> statement-breakpoint
CREATE INDEX "channel_messages_channel_thread_idx" ON "channel_messages" USING btree ("channel_id","thread_id");--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "channel_messages_tenant_isolation" ON "channel_messages" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.organization_id', true)) WITH CHECK (organization_id = current_setting('app.organization_id', true));
