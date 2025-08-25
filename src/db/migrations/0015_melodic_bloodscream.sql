ALTER TABLE "analyses" ADD COLUMN "page_type" varchar(50);--> statement-breakpoint
CREATE INDEX "analyses_page_type_idx" ON "analyses" USING btree ("page_type");