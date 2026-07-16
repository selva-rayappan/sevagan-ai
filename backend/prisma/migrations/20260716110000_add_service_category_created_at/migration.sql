-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- A plain DEFAULT backfill would give every existing row the same timestamp,
-- making the customer-facing WhatsApp menu order (which is now createdAt-based)
-- arbitrary instead of preserving the original seeded 1-8 numbering. Stagger
-- explicit timestamps for the known seed categories to keep that order stable.
-- No-op on a fresh DB where these rows don't exist yet.
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:01' WHERE "name" = 'Electrical';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:02' WHERE "name" = 'Plumbing';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:03' WHERE "name" = 'AC Service';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:04' WHERE "name" = 'Carpentry';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:05' WHERE "name" = 'Painting';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:06' WHERE "name" = 'Appliance Repair';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:07' WHERE "name" = 'RO Service';
UPDATE "service_categories" SET "created_at" = '2020-01-01 00:00:08' WHERE "name" = 'CCTV Installation';
