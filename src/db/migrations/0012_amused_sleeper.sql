CREATE TABLE "analysis_quality_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"recommendation_specificity" numeric(3, 2),
	"data_coverage" numeric(3, 2),
	"accuracy_confidence" numeric(3, 2),
	"improvement_over_basic" jsonb,
	"processing_time" integer,
	"token_efficiency" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "extraction_data_used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "data_richness_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "analysis_version" varchar(50) DEFAULT '2.0.0';--> statement-breakpoint
ALTER TABLE "analysis_quality_metrics" ADD CONSTRAINT "analysis_quality_metrics_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_quality_metrics_analysis_idx" ON "analysis_quality_metrics" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "analysis_quality_metrics_coverage_idx" ON "analysis_quality_metrics" USING btree ("data_coverage");--> statement-breakpoint
CREATE INDEX "analysis_quality_metrics_confidence_idx" ON "analysis_quality_metrics" USING btree ("accuracy_confidence");--> statement-breakpoint
CREATE INDEX "analyses_extraction_enhanced_idx" ON "analyses" USING btree ("extraction_data_used");--> statement-breakpoint
CREATE INDEX "analyses_data_richness_score_idx" ON "analyses" USING btree ("data_richness_score");