ALTER TABLE "analysis_quality_metrics" ADD COLUMN "completeness_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analysis_quality_metrics" ADD COLUMN "actionability_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analysis_quality_metrics" ADD COLUMN "business_impact_potential" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analysis_quality_metrics" ADD COLUMN "implementation_difficulty" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "extraction_metadata" ADD COLUMN "ai_model" varchar(100);--> statement-breakpoint
ALTER TABLE "extraction_metadata" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "extraction_metadata" ADD COLUMN "cost_usd" numeric(8, 6);