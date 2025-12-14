# Project Review Report - Alicard V2

## Executive Summary

This report documents all errors, issues, and potential problems found during the comprehensive review of the Alicard V2 project. The review covered database schema, API routes, TypeScript compilation, and code consistency.

**Total Issues Found: 50+**

---

## 1. TypeScript Compilation Errors (Critical)

### 1.1 Prisma Client Import Issues
- **File**: `src/server/lib/leaderboard-sync.ts:1`
- **Error**: `Cannot find module '../../generated/prisma/client'`
- **Issue**: Incorrect import path. Should use the generated Prisma client from the correct location.
- **Fix**: Change import to match the pattern used in `src/server/db.ts`

### 1.2 Missing Prisma Includes in Combat Router
- **File**: `src/server/api/routers/combat.ts`
- **Errors**: 
  - Line 34: `'weapon' does not exist in type 'EquipmentInclude'`
  - Line 46, 65, 154, 189, 190, 194: `Property 'stats' does not exist on type Player`
  - Line 65, 194: `Property 'equipment' does not exist on type Player`
  - Line 231: `Property 'skills' does not exist on type Player`
- **Issue**: The `player.findUnique` query doesn't include the required relations (`stats`, `equipment`, `skills`)
- **Fix**: Add proper `include` statements to fetch related data

### 1.3 Battle Router Status Type Mismatch
- **File**: `src/server/api/routers/battle.ts`
- **Errors**:
  - Line 403: `Type '"WON"' is not assignable to type '"ACTIVE"'`
  - Line 449: `Type '"LOST"' is not assignable to type '"ACTIVE"'`
- **Issue**: Attempting to update battle status with wrong enum values
- **Fix**: Use correct `BattleStatus` enum values: `"WON"`, `"LOST"`, `"ACTIVE"`, `"FLED"`

### 1.4 Battle Router JSON Type Issue
- **File**: `src/server/api/routers/battle.ts:461`
- **Error**: `Type '(JsonValue | BattleEvent)[]' is not assignable to type 'InputJsonValue'`
- **Issue**: Type mismatch when storing battle log in JSON field
- **Fix**: Properly type cast or structure the JSON data

### 1.5 MapTile Unique Constraint Issues
- **Files**: 
  - `src/server/api/routers/jobs.ts:78, 257`
  - `src/server/api/routers/world/map.ts:137, 204`
- **Error**: `'x_y' does not exist in type 'MapTileWhereUniqueInput'`
- **Issue**: Using incorrect unique constraint name. Schema uses `@@unique([worldId, x, y])` which creates a composite key
- **Fix**: Use `worldId_x_y` format or the correct composite key syntax

### 1.6 MapTile Creation Missing World Relation
- **Files**:
  - `src/server/api/routers/jobs.ts:80, 259`
  - `src/server/api/routers/world/map.ts:146`
- **Error**: `Property 'world' is missing in type MapTileCreateInput`
- **Issue**: Creating MapTile without required world relation
- **Fix**: Include `world: { connect: { id: worldId } }` or use `worldId` in unchecked input

### 1.7 MapPosition Missing worldId
- **File**: `src/server/api/routers/jobs.ts:121, 300`
- **Error**: `Property 'worldId' is missing in type MapPositionCreateWithoutPlayerInput`
- **Issue**: Creating MapPosition without required `worldId` field
- **Fix**: Add `worldId` to the create data

### 1.8 Content Router JSON Type Issues
- **Files**:
  - `src/server/api/routers/content/maps.ts:241`
  - `src/server/api/routers/content/monsters.ts:162`
  - `src/server/api/routers/content/quests.ts:189`
- **Error**: `Type 'unknown' is not assignable to type 'InputJsonValue'`
- **Issue**: JSON fields need proper type casting
- **Fix**: Cast to `Prisma.InputJsonValue` or use `JSON.parse(JSON.stringify(data))`

### 1.9 Content Router Zod Parse Issues
- **Files**:
  - `src/server/api/routers/content/maps.ts:69, 98, 155, 186`
  - `src/server/api/routers/content/quests.ts:82, 145`
- **Error**: `Expected 2-3 arguments, but got 1`
- **Issue**: `z.string().json()` or similar Zod methods need proper arguments
- **Fix**: Use `z.any().transform()` or `z.string().transform(JSON.parse)`

### 1.10 Seed File Type Issues
- **File**: `prisma/seed.ts:135`
- **Error**: `Type 'string' is not assignable to type 'TileType'`
- **Issue**: Using string literal instead of enum value
- **Fix**: Use `TileType.GRASS` or cast properly

### 1.11 Skills Router Dynamic Property Access
- **File**: `src/server/api/routers/character/skills.ts:198`
- **Error**: `Element implicitly has an 'any' type because expression of type 'slot${number}SkillId' can't be used to index type`
- **Issue**: Dynamic property access without proper typing
- **Fix**: Use type assertion or proper type guards

### 1.12 Profile Router Null Session
- **File**: `src/server/api/routers/profile.ts:305`
- **Error**: `'ctx.session' is possibly 'null'`
- **Issue**: Missing null check for session
- **Fix**: Add null check or use protectedProcedure

### 1.13 Frontend Type Issues

#### Leaderboards Page
- **File**: `src/app/leaderboards/page.tsx`
- **Errors**: Multiple properties don't exist on union types (pveKills, pvpKills, pvpWins, etc.)
- **Issue**: Type narrowing needed for different leaderboard types
- **Fix**: Use type guards or discriminated unions

#### Combat Page
- **File**: `src/app/combat/page.tsx:143`
- **Error**: `JsonValue` not assignable to battle event type
- **Issue**: Need to type cast JSON log entries
- **Fix**: Add proper type assertion

#### Equipment Page
- **File**: `src/app/equipment/page.tsx:74`
- **Error**: `'primary' is possibly 'undefined'`
- **Issue**: Missing null check
- **Fix**: Add optional chaining or null check

#### Profile Pages
- **Files**: 
  - `src/app/profile/[username]/page.tsx:59`
  - `src/app/profile/page.tsx:117`
- **Error**: `Type 'string' is not assignable to type '"Fallen" | "Alive"'`
- **Issue**: Status should be typed as union type
- **Fix**: Use proper type or type assertion

#### Character Summary Card
- **File**: `src/app/hub/_components/character-summary-card.tsx:40`
- **Error**: `Right operand of ?? is unreachable because the left operand is never nullish`
- **Issue**: Unnecessary nullish coalescing
- **Fix**: Remove unnecessary `??` operator

#### Profile Stats Card
- **File**: `src/app/profile/_components/profile-stats-card.tsx:59`
- **Error**: Same unreachable nullish coalescing
- **Fix**: Remove unnecessary `??` operator

### 1.14 Pre-migration Cleanup
- **File**: `prisma/pre-migration-cleanup.ts:74, 142`
- **Error**: `'keep' is possibly 'undefined'`
- **Issue**: Missing null check
- **Fix**: Add null check before accessing

---

## 2. Database Schema Issues

### 2.1 Character vs Player Model Confusion
- **Issue**: The codebase uses both `Character` and `Player` models, which creates confusion:
  - `Character` model: Basic character info (userId, name, stats, hp, stamina)
  - `Player` model: Game-specific player data (characterName, level, experience, gold, deathCount)
- **Problem**: Some code queries `Character` when it should query `Player`, and vice versa
- **Files Affected**:
  - `src/server/api/routers/battle.ts` - Uses both models inconsistently
  - `src/server/api/routers/combat.ts` - May need to use Player instead of Character
- **Recommendation**: 
  - Clarify the relationship: Character is legacy/account-level, Player is game-specific
  - Consider deprecating Character model if Player is the primary model
  - Or document when to use each model

### 2.2 Missing Database Relations
- **Issue**: Some queries don't include required relations, causing runtime errors
- **Examples**:
  - Combat router doesn't include `stats`, `equipment`, `skills` when fetching player
  - Battle router syncs Character but should work with Player model

### 2.3 MapTile Unique Constraint
- **Issue**: Schema defines `@@unique([worldId, x, y])` but code tries to use `x_y` format
- **Fix**: Use `{ worldId_x_y: { worldId, x, y } }` format for unique queries

---

## 3. API Route Issues

### 3.1 Missing Includes in Queries
- **Files**: Multiple router files
- **Issue**: Prisma queries don't include related data, causing `undefined` property access
- **Critical Files**:
  - `src/server/api/routers/combat.ts` - Missing stats, equipment, skills
  - `src/server/api/routers/battle.ts` - May need proper includes

### 3.2 Incorrect Model Usage
- **File**: `src/server/api/routers/battle.ts`
- **Issue**: Uses `db.character` for syncing but should work with `Player` model primarily
- **Problem**: Creates inconsistency between Character and Player data

### 3.3 Type Safety in JSON Fields
- **Issue**: JSON fields (battle.log, MapZone.tilesJSON, etc.) need proper type validation
- **Files**: Content routers, battle router
- **Fix**: Use Zod schemas for JSON validation before storing

---

## 4. Code Quality Issues

### 4.1 Type Safety
- Multiple `any` types or implicit any
- Missing null checks
- Incorrect type assertions

### 4.2 Error Handling
- Some database queries don't handle missing data gracefully
- Missing error boundaries in some components

### 4.3 Code Consistency
- Mixed usage of Character vs Player models
- Inconsistent error messages
- Some files use different patterns for similar operations

---

## 5. Configuration Issues

### 5.1 Prisma Client Path
- **File**: `src/server/lib/leaderboard-sync.ts`
- **Issue**: Incorrect import path for Prisma client
- **Current**: `../../generated/prisma/client`
- **Should be**: Match the pattern in `src/server/db.ts` which uses `../../generated/prisma/client`

---

## 6. Priority Fixes

### Critical (Must Fix Before Production)
1. ✅ Fix Prisma client import in `leaderboard-sync.ts`
2. ✅ Add missing includes in combat router queries
3. ✅ Fix battle status enum usage
4. ✅ Fix MapTile unique constraint queries
5. ✅ Add worldId to MapPosition creation
6. ✅ Fix JSON type issues in content routers

### High Priority
1. ✅ Resolve Character vs Player model confusion
2. ✅ Fix frontend type issues (leaderboards, combat, profile)
3. ✅ Add proper null checks
4. ✅ Fix seed file type issues

### Medium Priority
1. ✅ Improve error handling
2. ✅ Add type guards for union types
3. ✅ Clean up unnecessary nullish coalescing
4. ✅ Document model usage patterns

---

## 7. Recommendations

### 7.1 Model Architecture
- **Recommendation**: Create clear documentation on when to use Character vs Player
- Consider: Deprecate Character model if Player is the primary model
- Alternative: Keep Character for account-level data, Player for game-specific data

### 7.2 Type Safety
- Add strict TypeScript checks
- Use Zod for all API inputs
- Add runtime type validation for JSON fields

### 7.3 Testing
- Add unit tests for critical routers
- Add integration tests for database operations
- Test type safety with TypeScript compiler

### 7.4 Documentation
- Document model relationships
- Add JSDoc comments for complex functions
- Create API documentation

---

## 8. Files Requiring Immediate Attention

1. `src/server/api/routers/combat.ts` - Missing includes, type errors
2. `src/server/api/routers/battle.ts` - Status enum, JSON types, model confusion
3. `src/server/api/routers/jobs.ts` - MapTile queries, MapPosition worldId
4. `src/server/api/routers/world/map.ts` - MapTile unique constraint
5. `src/server/api/routers/content/*.ts` - JSON type issues, Zod parsing
6. `src/server/lib/leaderboard-sync.ts` - Import path
7. `src/app/leaderboards/page.tsx` - Type narrowing
8. `prisma/seed.ts` - Enum types

---

## Summary

The project has a solid foundation but requires significant TypeScript fixes and database query corrections. The main issues are:

1. **Type Safety**: 30+ TypeScript compilation errors
2. **Database Queries**: Missing includes and incorrect unique constraint usage
3. **Model Confusion**: Unclear distinction between Character and Player models
4. **Type Narrowing**: Frontend components need better type guards

Most issues are fixable with proper type annotations, adding missing includes, and correcting enum/constraint usage. The codebase structure is good, but needs these fixes before production deployment.
