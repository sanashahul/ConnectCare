ALTER TABLE "clients" ADD COLUMN "client_code" text;--> statement-breakpoint
-- Give existing clients a random ID in the same format as src/lib/client-code.ts (CC- + 5 characters).
DO $$
DECLARE
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  r record;
  code text;
BEGIN
  FOR r IN SELECT id FROM clients WHERE client_code IS NULL LOOP
    LOOP
      code := 'CC-';
      FOR i IN 1..5 LOOP
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE client_code = code);
    END LOOP;
    UPDATE clients SET client_code = code WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "client_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_client_code_unique" UNIQUE("client_code");
