CREATE TABLE "extracted_business_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"business_name" varchar(255),
	"industry" varchar(100),
	"description" text,
	"mission_statement" text,
	"value_proposition" text,
	"founded_year" integer,
	"size_indicator" varchar(50),
	"location" jsonb,
	"contact_info" jsonb,
	"business_hours" jsonb,
	"services_offered" jsonb,
	"target_audience" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_ctas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"text" varchar(255) NOT NULL,
	"cta_type" varchar(50),
	"prominence" varchar(20),
	"position_on_page" varchar(50),
	"urgency_level" varchar(20),
	"target_url" text,
	"visual_style" jsonb,
	"psychology_triggers" jsonb,
	"conversion_context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_products_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price_info" jsonb,
	"features" jsonb,
	"specifications" jsonb,
	"benefits" jsonb,
	"images" jsonb,
	"category" varchar(100),
	"availability_status" varchar(50),
	"sku" varchar(100),
	"rating_info" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_psychology_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"trigger_type" varchar(50),
	"element_text" text,
	"position_on_page" varchar(50),
	"effectiveness_score" numeric(3, 2),
	"context" text,
	"recommendation" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_seo_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"element_type" varchar(50),
	"content" text NOT NULL,
	"html_tag" varchar(20),
	"position" integer,
	"character_count" integer,
	"keyword_density" jsonb,
	"optimization_score" numeric(3, 2),
	"recommendations" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_social_proof" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"proof_type" varchar(50),
	"content" text,
	"source" varchar(255),
	"rating" numeric(2, 1),
	"date_mentioned" date,
	"verification_status" boolean DEFAULT false,
	"prominence" varchar(20),
	"credibility_indicators" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extraction_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"extraction_type" varchar(50) NOT NULL,
	"confidence_score" numeric(3, 2),
	"processing_time" integer,
	"prompt_used" text,
	"schema_version" varchar(20) DEFAULT '1.0.0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "extracted_business_info" ADD CONSTRAINT "extracted_business_info_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_ctas" ADD CONSTRAINT "extracted_ctas_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_products_services" ADD CONSTRAINT "extracted_products_services_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_psychology_elements" ADD CONSTRAINT "extracted_psychology_elements_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_seo_elements" ADD CONSTRAINT "extracted_seo_elements_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_social_proof" ADD CONSTRAINT "extracted_social_proof_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_metadata" ADD CONSTRAINT "extraction_metadata_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extracted_business_info_analysis_idx" ON "extracted_business_info" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_ctas_analysis_idx" ON "extracted_ctas" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_ctas_type_idx" ON "extracted_ctas" USING btree ("cta_type");--> statement-breakpoint
CREATE INDEX "extracted_ctas_prominence_type_idx" ON "extracted_ctas" USING btree ("prominence","cta_type");--> statement-breakpoint
CREATE INDEX "extracted_products_analysis_idx" ON "extracted_products_services" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_products_type_idx" ON "extracted_products_services" USING btree ("type");--> statement-breakpoint
CREATE INDEX "extracted_psychology_analysis_idx" ON "extracted_psychology_elements" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_psychology_type_idx" ON "extracted_psychology_elements" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "extracted_seo_analysis_idx" ON "extracted_seo_elements" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_seo_type_idx" ON "extracted_seo_elements" USING btree ("element_type");--> statement-breakpoint
CREATE INDEX "extracted_social_proof_analysis_idx" ON "extracted_social_proof" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extracted_social_proof_type_idx" ON "extracted_social_proof" USING btree ("proof_type");--> statement-breakpoint
CREATE INDEX "extraction_metadata_analysis_idx" ON "extraction_metadata" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "extraction_metadata_type_idx" ON "extraction_metadata" USING btree ("extraction_type");