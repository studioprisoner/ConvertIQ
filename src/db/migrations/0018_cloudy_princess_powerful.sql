CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"root_domain" varchar(253) NOT NULL,
	"display_name" varchar(255),
	"description" text,
	"is_validated" boolean DEFAULT false NOT NULL,
	"validation_status" varchar(50) DEFAULT 'unverified',
	"validation_message" text,
	"verification_token" varchar(64),
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "domains_user_root_domain_idx" ON "domains" USING btree ("user_id","root_domain");--> statement-breakpoint
CREATE INDEX "domains_user_id_idx" ON "domains" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;