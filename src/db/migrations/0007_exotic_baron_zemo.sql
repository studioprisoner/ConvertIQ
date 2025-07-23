CREATE TYPE "public"."analysis_actions" AS ENUM('none', 'rescan', 'retry');--> statement-breakpoint
ALTER TYPE "public"."analysis_status" ADD VALUE 'deleted';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "actions" "analysis_actions" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "primary_domain" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_completed" boolean NOT NULL;