ALTER TYPE "public"."intake_source" ADD VALUE 'google_form';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_external_id_unique" UNIQUE("external_id");