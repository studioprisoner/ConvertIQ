-- Add primary domain field to user table
ALTER TABLE "user" ADD COLUMN "primary_domain" text;