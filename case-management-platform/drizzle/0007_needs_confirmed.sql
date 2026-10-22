ALTER TABLE "clients" ADD COLUMN "needs_confirmed_at" timestamp with time zone;--> statement-breakpoint
-- Clients already being worked on (a note or a plan step) count as confirmed.
UPDATE "clients" SET "needs_confirmed_at" = "updated_at" WHERE "id" IN (SELECT "client_id" FROM "notes" UNION SELECT "client_id" FROM "plan_items");