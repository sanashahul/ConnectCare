-- Loads the outreach schedule (Nov-Dec 2026) sent by the program lead.
-- Sites are created if missing; a shift is skipped if that site already has one on that date,
-- so this is safe to run on a database where some shifts were added by hand.
-- Each shift gets a random 6-character code from the same alphabet as src/lib/shift-utils.ts.
INSERT INTO "sites" ("name", "address") VALUES
  ('Hope''s Corner', '748 Mercy St, Mountain View, CA 94041'),
  ('Neighborhood Hands', '500 Coleman Ave, San Jose, CA'),
  ('Hope for the Unhoused', '1432 S Main St, Milpitas, CA 95035'),
  ('Helping Hands', 'Sunnyvale Public Library, 665 W Olive Ave, Sunnyvale, CA'),
  ('WeHOPE', '1854 Bay Road, East Palo Alto, CA 94303')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "shifts" ("site_id", "shift_date", "meet_time", "return_time", "code")
SELECT s."id", v.shift_date::date, v.meet_time, v.return_time,
  (SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTVWXYZ', 1 + floor(random() * 30)::int, 1), '')
     FROM generate_series(1, 6) WHERE v.shift_date IS NOT NULL)
FROM (VALUES
  ('Hope''s Corner',         '2026-11-14', '7:15 am',  '10:30 am'),
  ('Neighborhood Hands',     '2026-11-14', '7:45 am',  '10:45 am'),
  ('Hope for the Unhoused',  '2026-11-15', '9:40 am',  '1:15 pm'),
  ('Neighborhood Hands',     '2026-11-28', '7:45 am',  '10:45 am'),
  ('Helping Hands',          '2026-11-28', '11:00 am', '1:30 pm'),
  ('Hope for the Unhoused',  '2026-11-29', '9:40 am',  '1:15 pm'),
  ('WeHOPE',                 '2026-12-08', '5:15 pm',  '7:45 pm'),
  ('Hope''s Corner',         '2026-12-12', '7:15 am',  '10:30 am'),
  ('Neighborhood Hands',     '2026-12-12', '7:45 am',  '10:45 am'),
  ('Hope for the Unhoused',  '2026-12-13', '9:40 am',  '1:15 pm'),
  ('Neighborhood Hands',     '2026-12-26', '7:45 am',  '10:45 am'),
  ('Helping Hands',          '2026-12-26', '11:00 am', '1:30 pm')
) AS v(site_name, shift_date, meet_time, return_time)
JOIN "sites" s ON s."name" = v.site_name
WHERE NOT EXISTS (
  SELECT 1 FROM "shifts" x WHERE x."site_id" = s."id" AND x."shift_date" = v.shift_date::date
);
