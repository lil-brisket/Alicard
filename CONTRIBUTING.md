# Contributing to Alicard V2

## Database Schema Changes

**⚠️ CRITICAL RULE**: All database schema changes MUST go through Prisma migrations.

### Why?

- Migrations are version-controlled
- Migrations are reversible
- Migrations can be tested
- Migrations are production-safe

### What NOT to Do

❌ **NEVER** use `prisma db push`  
❌ **NEVER** manually modify the database schema  
❌ **NEVER** skip migration files in commits

### What TO Do

✅ **ALWAYS** use `npm run db:generate` for schema changes  
✅ **ALWAYS** run `npm run db:check` before committing  
✅ **ALWAYS** commit both `schema.prisma` and migration files together

### Workflow

1. Edit `prisma/schema.prisma`
2. Run `npm run db:generate`
3. Review the generated migration
4. Run `npm run db:check`
5. Commit both files together

See [`prisma/MIGRATION_WORKFLOW.md`](./prisma/MIGRATION_WORKFLOW.md) for detailed documentation.
