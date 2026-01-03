-- Step 1: Add slug column as nullable first
ALTER TABLE "QuestTemplate" ADD COLUMN "slug" TEXT;

-- Step 2: Create a function to generate slugs from text (similar to slugify utility)
CREATE OR REPLACE FUNCTION slugify(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(input_text),
          '[^\w\s-]', '', 'g'
        ),
        '[\s_-]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Generate slugs for existing rows based on their name field
-- First, generate base slugs for all rows
UPDATE "QuestTemplate"
SET "slug" = slugify(COALESCE("name", "id"));

-- Step 3b: Handle duplicates by appending numbers where needed
-- This uses a recursive CTE-like approach to ensure uniqueness
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  unique_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, slug FROM "QuestTemplate" ORDER BY "createdAt" LOOP
    base_slug := rec.slug;
    unique_slug := base_slug;
    counter := 1;
    
    -- Check if this slug already exists (excluding current row)
    WHILE EXISTS (
      SELECT 1 FROM "QuestTemplate" 
      WHERE "slug" = unique_slug AND id != rec.id
    ) LOOP
      unique_slug := base_slug || '-' || counter::TEXT;
      counter := counter + 1;
    END LOOP;
    
    -- Update with unique slug
    UPDATE "QuestTemplate" SET "slug" = unique_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 4: Make slug column NOT NULL
ALTER TABLE "QuestTemplate" ALTER COLUMN "slug" SET NOT NULL;

-- Step 5: Add unique constraint
CREATE UNIQUE INDEX "QuestTemplate_slug_key" ON "QuestTemplate"("slug");

-- Step 6: Add index for faster lookups
CREATE INDEX "QuestTemplate_slug_idx" ON "QuestTemplate"("slug");

-- Step 7: Clean up the temporary function (optional, but clean)
DROP FUNCTION IF EXISTS slugify(TEXT);

