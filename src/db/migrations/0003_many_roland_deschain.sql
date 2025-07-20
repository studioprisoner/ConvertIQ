ALTER TABLE "websites" DROP CONSTRAINT "websites_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_url" text;