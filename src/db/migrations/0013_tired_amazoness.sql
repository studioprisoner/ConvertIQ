DROP INDEX "analyses_batch_job_idx";--> statement-breakpoint
DROP INDEX "analyses_crawl_job_idx";--> statement-breakpoint
DROP INDEX "analyses_parent_analysis_idx";--> statement-breakpoint
CREATE INDEX "analyses_batch_job_idx" ON "analyses" USING btree ("batch_job_id") WHERE "analyses"."batch_job_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "analyses_crawl_job_idx" ON "analyses" USING btree ("crawl_job_id") WHERE "analyses"."crawl_job_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "analyses_parent_analysis_idx" ON "analyses" USING btree ("parent_analysis_id") WHERE "analyses"."parent_analysis_id" IS NOT NULL;