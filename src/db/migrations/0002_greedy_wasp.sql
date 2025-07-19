DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "page_type" varchar(50);--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "is_validated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "validation_status" varchar(50);--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "validation_message" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "last_validated_at" timestamp;