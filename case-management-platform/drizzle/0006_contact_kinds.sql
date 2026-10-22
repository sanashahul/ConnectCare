CREATE TYPE "public"."note_kind" AS ENUM('met', 'not_found', 'update');--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "kind" "note_kind" DEFAULT 'met' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "where_enc" text;--> statement-breakpoint
ALTER TABLE "plan_items" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "plan_items" SET "status_changed_at" = "updated_at" WHERE "status" <> 'todo';