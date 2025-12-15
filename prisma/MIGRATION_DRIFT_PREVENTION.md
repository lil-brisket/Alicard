# Migration Drift Prevention Guide

## Why You're Getting Constant Drift Errors

**Root Cause**: Migration files are being manually edited after they're created and applied.

### The Problem

1. Prisma generates a migration file with specific SQL
2. Migration is applied to the database
3. Someone manually edits the migration file (adding `IF EXISTS` checks, etc.)
4. Prisma detects the migration file doesn't match what was applied → **DRIFT ERROR**

### Why This Happens

You're likely editing migrations to make them "idempotent" (safe to run multiple times), but this breaks Prisma's migration tracking.

## Solutions

### ✅ Solution 1: Don't Edit Migration Files (Recommended)

**Rule**: Once a migration is created, **NEVER edit it**. Treat migration files as immutable.

**If you need to fix a migration:**
1. Create a NEW migration that fixes the issue
2. Never edit an existing migration file

### ✅ Solution 2: Use `--create-only` Flag

If you need to manually edit a migration before applying it:

```bash
# Create migration without applying
npx prisma migrate dev --create-only --name your_migration_name

# Edit the migration file manually
# Then apply it
npx prisma migrate deploy
```

### ✅ Solution 3: Accept Drift (Not Recommended)

If you must edit migrations, you can mark them as resolved:

```bash
npx prisma migrate resolve --applied <migration_name>
```

But this is a workaround and not a best practice.

## Best Practices

### 1. Always Use `npm run db:generate`

```bash
# This creates AND applies the migration
npm run db:generate
```

### 2. Never Manually Edit Applied Migrations

If a migration has been applied to the database, **DO NOT EDIT IT**.

### 3. If You Need Idempotent Migrations

Instead of editing migrations, use Prisma's built-in features:

- Use `@default()` values in schema
- Prisma handles column existence automatically
- Use migrations for schema changes, not data fixes

### 4. For Development: Reset Instead of Editing

If you need to change something:
```bash
# Reset database (loses data)
npx prisma migrate reset

# Or create a new migration
npm run db:generate
```

## Current Situation

Your migrations `20251214221758_add_damage_and_coin_fields` and `20251215000000_add_global_content_taxonomy` have been manually edited with `IF EXISTS` checks.

**To fix the current drift:**

1. **Option A (Recommended)**: Reset the database
   ```bash
   npx prisma migrate reset
   ```
   This will reapply all migrations from scratch.

2. **Option B**: Mark migrations as resolved
   ```bash
   npx prisma migrate resolve --applied 20251214221758_add_damage_and_coin_fields
   npx prisma migrate resolve --applied 20251215000000_add_global_content_taxonomy
   ```

## Prevention Checklist

- [ ] Never edit migration files after they're applied
- [ ] Always use `npm run db:generate` to create migrations
- [ ] If you need to fix something, create a NEW migration
- [ ] Run `npm run db:check` before committing
- [ ] Review migration SQL before applying (but don't edit it)

## When It's OK to Edit Migrations

**Only** if:
- The migration hasn't been applied yet (`--create-only` flag)
- You're fixing a syntax error before first application
- You're in development and resetting anyway

**Never** if:
- The migration has been applied to any database
- You're working with a team
- You're in production or staging
