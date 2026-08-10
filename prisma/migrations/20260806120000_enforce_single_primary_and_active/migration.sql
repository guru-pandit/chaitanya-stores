-- Phase 4 audit findings #12/#13 (docs/audit/phase4-final-report.md):
-- "ShopLocation.isPrimary" ("exactly one primary") and
-- "FestivalBanner.isActive" ("at most one active") were only enforced by an
-- application-level $transaction (updateMany-then-create/update), which
-- cannot serialize two genuinely concurrent requests under READ COMMITTED —
-- confirmed live: 3-6 rows ended up primary across repeated 6-way
-- concurrent POST tests. This migration was created via
-- `prisma migrate dev --create-only` and then hand-edited, since Prisma's
-- schema language has no syntax for a partial/filtered unique index.
--
-- Order matters: the data-repair UPDATEs below MUST run before the unique
-- indexes are created, or CREATE UNIQUE INDEX will fail outright on any
-- database that currently has more than one primary/active row.

-- Data repair: if more than one ShopLocation row currently has
-- isPrimary = true, keep the OLDEST row (by createdAt) as primary and
-- demote the rest. Ties on createdAt (extremely unlikely — millisecond
-- resolution) are broken by "id" for a fully deterministic result.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "ShopLocation"
  WHERE "isPrimary" = true
)
UPDATE "ShopLocation"
SET "isPrimary" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- Same repair for FestivalBanner.isActive — keep the oldest active row,
-- deactivate the rest. Unlike ShopLocation, zero active rows is also a
-- valid resting state (between festivals), so there is no "at least one"
-- floor to worry about here, only "at most one".
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "FestivalBanner"
  WHERE "isActive" = true
)
UPDATE "FestivalBanner"
SET "isActive" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- Enforce the "at most one" half of both invariants at the database layer
-- (a partial unique index can express a ceiling, not a floor — "at least
-- one primary" for ShopLocation remains API-only, via the PATCH/DELETE
-- guards that refuse to unset/delete the sole primary; this migration's
-- repair step above only ever demotes extras, never promotes a row).
-- A concurrent writer that loses the race now gets a Postgres
-- unique-violation (P2002 via Prisma) instead of silently leaving two rows
-- primary/active — the API routes catch that P2002 (and P2034
-- transaction-conflict/deadlock errors) and return a clean 409 instead of
-- a raw 500 (see
-- src/app/api/shop-locations/route.ts, src/app/api/shop-locations/[id]/route.ts,
-- src/app/api/festival-banners/route.ts, src/app/api/festival-banners/[id]/route.ts).
--
-- DRIFT HAZARD (documented in schema.prisma alongside the model comments
-- too): a partial unique index has no equivalent in Prisma's schema
-- language, so schema.prisma cannot fully describe what the database now
-- enforces. Running a future `prisma migrate dev` will see the schema and
-- database disagree and propose a migration that DROPs both indexes below
-- to "reconcile" them — do NOT blindly accept that auto-generated diff.
-- Always hand-review (and hand-edit, as this migration was) any future
-- migration touching ShopLocation or FestivalBanner.
CREATE UNIQUE INDEX "ShopLocation_isPrimary_unique_when_true"
  ON "ShopLocation" ("isPrimary")
  WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "FestivalBanner_isActive_unique_when_true"
  ON "FestivalBanner" ("isActive")
  WHERE "isActive" = true;
