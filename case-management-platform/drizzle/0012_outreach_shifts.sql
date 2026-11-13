ALTER TYPE "public"."role" ADD VALUE 'clinical_manager';--> statement-breakpoint
CREATE TABLE "shift_checks" (
	"shift_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"result" text NOT NULL,
	"by_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_checks_shift_id_client_id_pk" PRIMARY KEY("shift_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"meet_time" text,
	"return_time" text,
	"code" text NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "not_responding_site_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "not_responding_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "not_responding_by_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "not_responding_tip_enc" text;--> statement-breakpoint
ALTER TABLE "shift_checks" ADD CONSTRAINT "shift_checks_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_checks" ADD CONSTRAINT "shift_checks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_checks" ADD CONSTRAINT "shift_checks_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shifts_date_idx" ON "shifts" USING btree ("shift_date");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_not_responding_site_id_sites_id_fk" FOREIGN KEY ("not_responding_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_not_responding_by_id_users_id_fk" FOREIGN KEY ("not_responding_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_not_responding_idx" ON "clients" USING btree ("not_responding_site_id");