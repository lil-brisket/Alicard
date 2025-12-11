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

- All model changes must be incremental
- Avoid hard deletes for major entities; use flags:
  - `isActive`
  - `isDeleted`
  - `deathCount`

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

## 5. Summary Checklist

AI must always abide by:

- ✅ No feature invention
- ✅ No large modifications
- ✅ Follow existing patterns
- ✅ Type everything
- ✅ Explain changes
- ✅ Minimal diffs
- ✅ Maintain the MMO design rules
- ✅ Keep turn-based gameplay intact

