# Database Migration Workflow

## ⚠️ Production-Grade Migration Policy

This project enforces a **migration-only workflow** to ensure database schema changes are:
- Version controlled
- Reversible
- Testable
- Production-safe

## ❌ NEVER Use These Commands

- `prisma db push` - **DISABLED** - Bypasses migration history
- Direct SQL changes to production database
- Manual schema modifications

## ✅ Always Use Migrations

### Development Workflow

1. **Modify `prisma/schema.prisma`**
   ```prisma
   model User {
     id    String @id @default(cuid())
     email String @unique
     // Add your changes here
   }
   ```

2. **Create and apply migration**
   ```bash
   npm run db:generate
   ```
   This will:
   - Generate Prisma Client
   - Create a new migration file in `prisma/migrations/`
   - Apply the migration to your database
   - Prompt you to name the migration

3. **Check for drift before committing**
   ```bash
   npm run db:check
   ```
   This verifies the database matches migration history.

4. **Commit both schema and migration files**
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat(db): add user email field"
   ```

### Production Workflow

1. **Deploy migrations**
   ```bash
   npm run db:migrate
   ```
   This applies all pending migrations without creating new ones.

2. **Verify migration status**
   ```bash
   npx prisma migrate status
   ```

## Migration Naming Convention

Use descriptive names that explain the change:

```bash
# Good
npm run db:generate -- --name add_user_email_verification
npm run db:generate -- --name add_multi_role_support
npm run db:generate -- --name remove_deprecated_fields

# Bad
npm run db:generate -- --name update
npm run db:generate -- --name changes
npm run db:generate -- --name fix
```

## Handling Migration Drift

If you see "drift detected" errors:

1. **Check what's different:**
   ```bash
   npx prisma migrate status
   ```

2. **If in development (data loss acceptable):**
   ```bash
   npx prisma migrate reset
   ```

3. **If in production or need to preserve data:**
   - Review the drift details
   - Create a migration that captures the current state
   - Apply it carefully

## Best Practices

1. **One logical change per migration** - Don't bundle unrelated changes
2. **Test migrations locally** - Always test before pushing to production
3. **Review migration SQL** - Check the generated SQL in `prisma/migrations/`
4. **Use transactions** - Prisma migrations run in transactions automatically
5. **Backup before production migrations** - Always backup production databases
6. **Run checks before commits** - Use `npm run db:check` in your workflow

## Troubleshooting

### "Migration drift detected"

**Cause:** Database schema doesn't match migration history.

**Solution:**
- If development: `npx prisma migrate reset`
- If production: Create a baseline migration to capture current state

### "Migration failed to apply"

**Cause:** Migration conflicts with existing data or schema.

**Solution:**
1. Check the error message
2. Review the migration SQL
3. Fix the migration file if needed
4. Re-run: `npm run db:generate`

### "Database is not in sync"

**Cause:** Schema file changed but no migration created.

**Solution:**
```bash
npm run db:generate
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Check migration drift
  run: npm run db:check

- name: Apply migrations
  run: npm run db:migrate
```

## Related Files

- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/` - Migration history
- `prisma/check-migration-drift.ts` - Drift checker script
- `package.json` - Scripts configuration
