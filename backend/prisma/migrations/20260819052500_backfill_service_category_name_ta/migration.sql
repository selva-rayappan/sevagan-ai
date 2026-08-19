-- Backfill Tamil names for existing categories, sourced from the static
-- service.* keys in ta.json that this column replaces. WHERE name_ta IS NULL
-- guards make this safe to re-run and won't clobber anything an admin has
-- already set via the new UI.
--
-- "Acting Driver" and "Home Appliance Repair" (renamed from "Appliance
-- Repair" at some point after the original seed, which is what broke their
-- lookup — see backend git history) had no prior translation anywhere; the
-- values below are a first-pass draft, not a certified translation — review
-- and correct via the admin Services page if needed.

UPDATE "service_categories" SET "name_ta" = 'மின்சாரம்' WHERE "name" = 'Electrical' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'குழாய் பணி' WHERE "name" = 'Plumbing' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'AC சேவை' WHERE "name" = 'AC Service' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'தச்சு வேலை' WHERE "name" = 'Carpentry' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'வண்ண வேலை' WHERE "name" = 'Painting' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'கருவி பழுதுபார்ப்பு' WHERE "name" = 'Appliance Repair' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'வீட்டு உபகரண பழுதுபார்ப்பு' WHERE "name" = 'Home Appliance Repair' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'RO சேவை' WHERE "name" = 'RO Service' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'CCTV நிறுவல்' WHERE "name" = 'CCTV Installation' AND "name_ta" IS NULL;
UPDATE "service_categories" SET "name_ta" = 'ஆக்டிங் டிரைவர் சேவை' WHERE "name" = 'Acting Driver' AND "name_ta" IS NULL;
