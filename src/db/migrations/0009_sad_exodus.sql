ALTER TABLE "analyses" ADD COLUMN "extraction_results" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "firecrawl_version" varchar(20) DEFAULT 'v2';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "extraction_prompts" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "batch_job_id" varchar(255);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "crawl_job_id" varchar(255);--> statement-breakpoint
CREATE INDEX "analyses_firecrawl_version_idx" ON "analyses" USING btree ("firecrawl_version");--> statement-breakpoint
CREATE INDEX "analyses_extraction_results_gin_idx" ON "analyses" USING gin ("extraction_results");--> statement-breakpoint
CREATE INDEX "analyses_batch_job_id_idx" ON "analyses" USING btree ("batch_job_id");--> statement-breakpoint
CREATE INDEX "analyses_crawl_job_id_idx" ON "analyses" USING btree ("crawl_job_id");