CREATE TYPE "public"."page_type_enum" AS ENUM('homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category', 'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout', 'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio', 'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq', 'search-results', 'unknown');--> statement-breakpoint
ALTER TYPE "public"."analysis_actions" ADD VALUE 'extract';--> statement-breakpoint
ALTER TYPE "public"."analysis_actions" ADD VALUE 'crawl';--> statement-breakpoint
ALTER TYPE "public"."analysis_actions" ADD VALUE 'batch';--> statement-breakpoint
ALTER TYPE "public"."analysis_status" ADD VALUE 'extracting';--> statement-breakpoint
ALTER TYPE "public"."analysis_status" ADD VALUE 'analyzing';--> statement-breakpoint
DROP INDEX "analyses_batch_job_id_idx";--> statement-breakpoint
DROP INDEX "analyses_crawl_job_id_idx";--> statement-breakpoint
ALTER TABLE "websites" ALTER COLUMN "page_type" SET DATA TYPE "public"."page_type_enum" USING "page_type"::"public"."page_type_enum";--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "extraction_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "data_richness" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "parent_analysis_id" uuid;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "is_batch_child" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "crawl_depth" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "crawl_page_count" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "ai_processing_time" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "token_usage" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "extraction_version" varchar(50) DEFAULT '1.0.0';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "load_time" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "page_size" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "resource_count" integer;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_parent_analysis_id_analyses_id_fk" FOREIGN KEY ("parent_analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_extraction_confidence_idx" ON "analyses" USING btree ("extraction_confidence");--> statement-breakpoint
CREATE INDEX "analyses_data_richness_idx" ON "analyses" USING btree ("data_richness");--> statement-breakpoint
CREATE INDEX "analyses_batch_job_idx" ON "analyses" USING btree ("batch_job_id");--> statement-breakpoint
CREATE INDEX "analyses_crawl_job_idx" ON "analyses" USING btree ("crawl_job_id");--> statement-breakpoint
CREATE INDEX "analyses_parent_analysis_idx" ON "analyses" USING btree ("parent_analysis_id");--> statement-breakpoint
CREATE INDEX "analyses_token_usage_gin_idx" ON "analyses" USING gin ("token_usage");--> statement-breakpoint
CREATE INDEX "analyses_extraction_prompts_gin_idx" ON "analyses" USING gin ("extraction_prompts");--> statement-breakpoint
CREATE INDEX "analyses_status_version_idx" ON "analyses" USING btree ("status","firecrawl_version");--> statement-breakpoint
CREATE INDEX "analyses_website_status_idx" ON "analyses" USING btree ("website_id","status");--> statement-breakpoint
CREATE INDEX "websites_page_type_idx" ON "websites" USING btree ("page_type");