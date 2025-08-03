-- Add 'archived' value to existing analysis_status enum
ALTER TYPE "public"."analysis_status" ADD VALUE IF NOT EXISTS 'archived';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "embedding_model" varchar(100) DEFAULT 'voyage-3.5';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "embedding_created_at" timestamp;--> statement-breakpoint
CREATE INDEX "analyses_embedding_hnsw_idx" ON "analyses" USING hnsw ("embedding" vector_cosine_ops);