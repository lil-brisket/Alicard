# CURSOR_RULES.md
AI Development Rules for SAO-Inspired Turn-Based MMO (T3 Stack Project)

## 1. Purpose

These rules define how Cursor (and any AI assistant) must behave while contributing to this project.
They enforce consistency, safety, and maintainability as the MMO grows.

## 2. AI Behavior Rules

### 2.1 Small, Focused Changes Only

- Modify only the files relevant to the current task.
- Avoid global refactors, renames, or large structural edits unless explicitly requested.
- If a change requires touching more than 5–7 files, AI must explain why before implementing it.

### 2.2 No Inventing Features

Do not add new systems, mechanics, UI screens, database fields, or game logic unless:

- It appears in the GDD / project design, or
- The user explicitly requested it.

### 2.3 Follow Existing Patterns

Maintain all existing patterns for:

- tRPC routers
- Prisma schema
- React file structure
- Tailwind usage
- Utility folder structure

Do not introduce new paradigms (e.g., switching to REST, Redux, Zustand, or new folder structures) unless explicitly asked.

### 2.4 TypeScript Is Mandatory

- Always use `.ts` or `.tsx`.
- Explicitly type:
  - Function signatures
  - Component props
  - API input/output schemas
- Avoid `any`; if unavoidable, annotate:
  ```typescript
  // TODO: remove any
  ```

### 2.5 No Silent Errors

- No empty catch blocks.
- No swallowing errors.
- Always return typed error structures or throw safely.

### 2.6 Respect T3 Boundaries

- Backend logic → tRPC routers
- Database access → Prisma
- UI → React components
- Shared types → shared folder
- No direct DB access from React components.

### 2.7 Explain Non-Trivial Changes

For any new file or multi-step change, AI must output:

- 3–8 bullet points summarizing changes
- Mention any assumptions or TODOs

### 2.8 Never Break Public Contracts

If modifying:

- tRPC procedure names
- Prisma model fields
- Route paths

AI must explicitly declare:
**"This is a breaking change: X → Y."**

### 2.9 Respect Game Design Constraints

The game must stay aligned with:

- Turn-based gameplay
- 2D travel map
- Perma-death after 5 deaths
- Stats: vitality, strength, speed, dexterity
- Health & stamina pools
- Occupations, guilds, markets, banking
- No real-time combat logic unless requested

### 2.10 Avoid Generating Large Boilerplate

- Implement only the minimum needed subset
- Leave:
  ```typescript
  // TODO: extend
  ```

## 3. Code & Architecture Standards

### 3.1 Project Structure

Use a modular T3-style structure:

```
src/
  app/ or pages/
  server/
    api/
      routers/
      root.ts
    db/
  features/
    map/
    combat/
    characters/
    guilds/
    markets/
    banking/
    occupations/
  lib/
    utils/
    types/
```

**Rule:** New logic goes into a feature folder whenever applicable.

### 3.2 React & UI Rules

- Functional components only
- Strongly typed props
- Tailwind for styling
- Prefer small components (<150–200 lines)
- Use composition instead of monolithic components

### 3.3 tRPC Rules

- All procedures must use Zod input validation
- Strongly typed inputs and outputs
- No untyped API data
- No raw SQL unless commented and necessary

### 3.4 Prisma Rules

- **MIGRATIONS ONLY**: All schema changes MUST go through migrations
- **NEVER** use `prisma db push` - it's disabled in this project
- **ALWAYS** create migrations: `npm run db:generate`
- **NEVER edit migration files** after they're created - they are immutable
- All model changes must be incremental
- Avoid hard deletes for major entities; use flags:
  - `isActive`
  - `isDeleted`
  - `deathCount`
- Before committing schema changes, run `npm run db:check`
- Migration names must be descriptive: `add_user_email_verification`, not `update`

### 3.5 Game Logic Rules

Stats must always appear in a single schema/type:

```typescript
type PlayerStats = {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
};
```

- Health & Stamina must be part of a unified player state
- Turn-based logic only—no real-time timers unless asked
- Perma-death triggers after `deathCount >= 5`

## 4. Workflow Rules (Every Task)

### Step 1 — Planning

AI must first list:

- Files it plans to edit
- Summary of changes
- No code yet

### Step 2 — Implementation

After approval, AI writes code following:

- Minimal diff
- Strict typing
- No unrelated changes

### Step 3 — Consistency Check

AI must ensure:

- TypeScript compiles
- No unused imports
- No mismatched types
- No broken exports

### Step 4 — Integration Explanation

AI must summarize:

- How the new change fits existing systems
- New TODOs
- Any assumptions made

### Step 5 — Manual Review (User)

User confirms:

- No unexpected file changes
- Patterns were followed
- Behavior aligns with design

## 5. Git Commit Message Rules

### 5.1 Conventional Commits Specification

All commit messages MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 5.2 Commit Types

- **feat**: A new feature (correlates with MINOR in Semantic Versioning)
- **fix**: A bug fix (correlates with PATCH in Semantic Versioning)
- **build**: Changes to build system or external dependencies
- **chore**: Changes to the build process or auxiliary tools
- **ci**: Changes to CI configuration files and scripts
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests

### 5.3 Commit Structure Requirements

- Commits MUST be prefixed with a type, followed by OPTIONAL scope, OPTIONAL `!`, and REQUIRED colon and space
- A scope MAY be provided after a type, surrounded by parentheses: `feat(parser):`
- A description MUST immediately follow the colon and space
- A longer commit body MAY be provided after the short description (one blank line after)
- One or more footers MAY be provided one blank line after the body

### 5.4 Breaking Changes

Breaking changes MUST be indicated by:
- Appending `!` after the type/scope: `feat(api)!: change endpoint`
- OR including `BREAKING CHANGE:` in the footer:
  ```
  feat(api): update endpoint
  
  BREAKING CHANGE: endpoint now requires authentication
  ```

### 5.5 Examples

```
feat(combat): add turn-based combat system

fix(player): resolve stamina calculation bug

docs: update API documentation

refactor(map): simplify grid movement logic

feat(api)!: require authentication for all endpoints

BREAKING CHANGE: all API endpoints now require valid session token
```

### 5.6 AI Commit Behavior

When committing changes, AI must:
- Use appropriate commit type based on changes made
- Include scope when changes affect specific module/feature
- Write clear, concise descriptions
- Use breaking change notation when applicable
- Never use generic messages like "update files" or "fix stuff"

## 6. Database Migration Rules

### 6.1 Mandatory Migration Workflow

**CRITICAL**: This project enforces production-grade migration policies.

- ✅ **ALWAYS** use `npm run db:generate` for schema changes
- ❌ **NEVER** use `prisma db push` (disabled)
- ✅ **ALWAYS** run `npm run db:check` before committing schema changes
- ✅ **ALWAYS** commit both `schema.prisma` and migration files together
- ✅ Use descriptive migration names following the pattern: `add_<feature>`, `update_<model>_<field>`, `remove_<deprecated>`

### 6.2 Schema Change Process

When modifying `prisma/schema.prisma`:

1. Make the change in `schema.prisma`
2. Run `npm run db:generate` (creates migration)
3. Review the generated migration SQL (but **DO NOT edit it**)
4. Run `npm run db:check` to verify no drift
5. Commit both files together

**Important**: The migration file generated by Prisma should be used as-is. Do not add `IF EXISTS` checks or modify the SQL. If you need different SQL, modify the schema and generate a new migration.

### 6.3 Migration File Immutability

**CRITICAL RULE**: Migration files are **IMMUTABLE** once created.

- ❌ **NEVER** edit migration files in `prisma/migrations/` after they are created
- ❌ **NEVER** add `IF EXISTS` or `IF NOT EXISTS` checks to migration SQL
- ❌ **NEVER** modify migration files to make them "idempotent"
- ❌ **NEVER** edit a migration file that has been applied to any database
- ✅ If you need to fix a migration, create a **NEW** migration instead
- ✅ If you need to review/edit before applying, use `--create-only` flag:
  ```bash
  npx prisma migrate dev --create-only --name migration_name
  # Edit the file (only if not yet applied)
  npx prisma migrate deploy
  ```

**Why**: Editing migration files after they're applied causes "migration drift" errors because Prisma tracks the exact SQL that was applied. If the file changes, Prisma detects a mismatch.

**If drift occurs**: Reset the database with `npx prisma migrate reset` (development only) or create a new migration to fix the issue.

### 6.4 AI Behavior for Schema Changes

AI must:
- Never suggest using `db:push`
- Always create migrations for schema changes
- **NEVER edit existing migration files** - only create new ones
- Verify migrations before completing the task
- Include migration files in any schema-related commits
- If a migration needs changes, create a NEW migration, never edit the old one

## 7. Summary Checklist

AI must always abide by:

- ✅ No feature invention
- ✅ No large modifications
- ✅ Follow existing patterns
- ✅ Type everything
- ✅ Explain changes
- ✅ Minimal diffs
- ✅ Maintain the MMO design rules
- ✅ Keep turn-based gameplay intact
- ✅ Use Conventional Commit Messages for all commits
- ✅ **Use migrations for ALL database schema changes**
- ✅ **Never use `prisma db push`**
- ✅ **Never edit migration files after they're created** - they are immutable

