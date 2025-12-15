-- Mark the migration as applied in Prisma's migration history
-- Run this in pgAdmin4 after applying the migration manually

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid(),
  '',
  NOW(),
  '20251215000000_add_global_content_taxonomy',
  NULL,
  NULL,
  NOW(),
  1
)
ON CONFLICT DO NOTHING;
