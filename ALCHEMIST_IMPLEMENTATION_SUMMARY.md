# Alchemist Profession Implementation Summary

## Overview
Implemented a fully data-driven Alchemy crafting system (level 1-100) with ~80 recipes that primarily consume items from the Herbalist job, plus new reagent/container items created as data.

## Completed Components

### 1. Database Schema Extensions ✅

**New Models:**
- `StationDefinition` - Data-driven crafting stations (editable via Content Panel)
- `EffectDefinition` - Data-driven effects for consumables (potions, oils, bombs)
- `ItemEffect` - Join table linking Items to EffectDefinitions (many-to-many)

**Recipe Model Extensions:**
- `successRate` (Float, nullable) - Data-driven success rate override (null = use calculated)
- `category` (String, nullable) - Recipe category (POTION, BREW, OIL, POWDER, SALVE, ELIXIR, BOMB, UTILITY)
- `stationDefinitionId` (String, nullable) - Reference to data-driven station (replaces enum for alchemy)
- `isDiscoverable` (Boolean) - Whether recipe can be discovered

**Migration:**
- Created migration: `20260110220031_add_alchemy_system`
- All fields are backward compatible with existing Blacksmith recipes

### 2. Server-Side APIs ✅

**New tRPC Routers:**
- `content.stations.*` - CRUD for StationDefinition
  - list, get, getByKey, create, update, delete
  - Filtering by stationType, unlockLevel, isEnabled, status
  - Validation: key uniqueness, station availability checks
  
- `content.effects.*` - CRUD for EffectDefinition
  - list, get, getByKey, create, update, delete
  - Filtering by type, status
  - Validation: duration requirements for timed effects, tickSeconds for DOT/HOT

**Extended Recipe Router:**
- Added support for `category`, `stationDefinitionId`, `successRate`, `isDiscoverable`
- Updated create, update, duplicate, bulkImport, exportRecipes to handle new fields
- Station validation: ensures station is enabled/active, checks unlock level

**Crafting Runtime Updates:**
- Updated `recipes.craftRecipe` to use `successRate` from recipe data (if provided)
- Station unlock checking: verifies player has required level for stationDefinition
- XP reward: uses `recipe.xp` if provided, otherwise calculates from difficulty

### 3. Data-Driven Architecture ✅

**All Values Editable via Content Panel:**
- ✅ Recipe lists, effect values, station unlocks, level requirements
- ✅ XP rewards, craft times, success rates
- ✅ Item stats, tags, properties
- ✅ No hard-coded values in UI logic

**Validation:**
- Zod schemas for all API endpoints
- Referential integrity checks (items, stations, effects must exist)
- Level bounds (1-100), success rate bounds (0-1)
- Station availability checks before crafting

## Pending Components

### 4. Content Panel UI ⏳

**Needed:**
- Alchemy section in Content Panel navigation (`/content/alchemy`)
- Stations subsection: List/CRUD for StationDefinition
- Effects subsection: List/CRUD for EffectDefinition  
- Recipes subsection: Filter by category, stationDefinition (already exists for recipes)

**Pattern to Follow:**
- See `/content/recipes` for recipe list/edit patterns
- See `/content/gathering/nodes` for station list/edit patterns
- Use existing Item picker component for item selection

### 5. Seed Data ⏳

**Needed:**
- 5 Alchemy Stations:
  - Mortar & Pestle (basic, level 1)
  - Alchemy Table (level 10)
  - Distillation Apparatus (level 25)
  - Infusion Vat (level 50)
  - Master Alchemy Lab (level 75)

- Reagent/Container Items:
  - Empty Glass Vial
  - Basic Solvent
  - Binding Agent
  - Volatile Catalyst
  - Stabilizing Salt
  - Linen Wrap

- Effect Definitions:
  - Healing effects (instant and regen)
  - Stamina restore effects
  - Stat buff effects
  - Resistance effects
  - DOT effects (for bombs)
  - Utility effects

- ~80 Recipes distributed across level bands:
  - L1-10: ~8 recipes (Minor potions)
  - L11-20: ~8 recipes
  - L21-30: ~8 recipes
  - ... up to L91-100: ~8 recipes (Supreme/Elite potions)

**Categories:**
- Potion (healing/stamina)
- Brew (buffing)
- Oil (weapon coatings)
- Powder (utility)
- Salve (regeneration)
- Elixir (long-duration buffs)
- Bomb (damage/utility)
- Utility (misc consumables)

### 6. Herbalist Linkage ✅ (Architecture Ready)

**Implementation:**
- Recipes can reference herbalist items via `sourceGatherJobKey: "herbalist"`
- Recipe validation checks if items are gatherable from herbalist
- Content Panel recipe editor can filter items by tag "herb"

**Verification Needed:**
- Ensure herbalist items exist and are tagged correctly
- Verify recipes primarily use herbalist items where possible

## How to Use

### Running the Migration
```bash
npm run db:generate  # Already created: 20260110220031_add_alchemy_system
npx prisma migrate deploy  # Apply to production
```

### Adding Seed Data
Seed data should be added to `prisma/seed.ts` after the existing recipe seeding (around line 4983).

### Testing the System

1. **Create a Station:**
   ```typescript
   await api.content.stations.create.mutate({
     key: "mortar-pestle",
     name: "Mortar & Pestle",
     stationType: "ALCHEMY",
     unlockLevel: 1,
     isEnabled: true,
     status: "ACTIVE",
   });
   ```

2. **Create an Effect:**
   ```typescript
   await api.content.effects.create.mutate({
     key: "heal-instant-100",
     name: "Instant Heal 100",
     type: "HEAL_INSTANT",
     magnitude: 100,
   });
   ```

3. **Create a Recipe:**
   ```typescript
   await api.content.recipes.create.mutate({
     name: "Minor Health Potion",
     jobId: alchemistJobId,
     stationDefinitionId: mortarPestleStationId,
     category: "POTION",
     requiredJobLevel: 1,
     craftTimeSeconds: 5,
     xp: 15,
     successRate: null, // Use calculated
     outputItemId: minorHealthPotionItemId,
     outputQty: 1,
     inputs: [
       { itemId: commonHerbId, qty: 2 },
       { itemId: emptyVialId, qty: 1 },
     ],
   });
   ```

4. **Craft a Recipe:**
   ```typescript
   await api.recipes.craftRecipe.mutate({
     recipeId: minorHealthPotionRecipeId,
   });
   ```

## Architecture Notes

### Station System
- Supports both enum-based stations (backward compatibility with Blacksmith) and data-driven stations (Alchemy)
- Recipes use either `station` (enum) OR `stationDefinitionId` (not both)
- Station unlock checking is automatic in crafting runtime

### Effect System
- Effects are completely data-driven
- Items can have multiple effects via ItemEffect join table
- Effect application is abstracted - runtime can query item effects and apply them
- Effect types: HEAL_INSTANT, HEAL_REGEN, STAMINA_RESTORE, BUFF_STAT, RESISTANCE, DAMAGE_OVER_TIME, UTILITY

### Success Rate System
- If `recipe.successRate` is provided (not null), use that value (0-1)
- If `recipe.successRate` is null, calculate based on: `clamp(0.2, 0.95, 0.55 + (jobLevel - difficulty) * 0.07)`
- This allows both calculated and data-driven success rates

### XP System
- If `recipe.xp` > 0, use that value
- Otherwise, calculate from difficulty: `success ? 15 + difficulty * 5 : 5 + difficulty * 2`
- Allows both calculated and data-driven XP rewards

## Next Steps

1. **Add seed data** (see section 5 above)
2. **Create Content Panel UI** for Alchemy section (stations, effects, recipes)
3. **Test end-to-end**: Create station → Create effect → Link to item → Create recipe → Craft recipe
4. **Verify Herbalist linkage**: Ensure recipes reference herbalist items where possible
5. **Add telemetry/logging**: Track crafting success/failure, recipeId, playerId, exp gained

## Files Changed

### Schema
- `prisma/schema.prisma` - Added StationDefinition, EffectDefinition, ItemEffect models; extended Recipe model

### Migrations
- `prisma/migrations/20260110220031_add_alchemy_system/migration.sql` - Database migration

### API Routers
- `src/server/api/routers/content/stations.ts` - NEW: StationDefinition CRUD
- `src/server/api/routers/content/effects.ts` - NEW: EffectDefinition CRUD
- `src/server/api/routers/content/recipes.ts` - UPDATED: Added new fields support
- `src/server/api/routers/content/index.ts` - UPDATED: Added stations and effects routers
- `src/server/api/routers/recipes.ts` - UPDATED: Use successRate from recipe, station unlock checking

### Seed Data (Pending)
- `prisma/seed.ts` - Needs: Stations, Effects, Reagents, ~80 Recipes

### Content Panel UI (Pending)
- `src/app/content/alchemy/` - NEW: Stations, Effects, Recipes pages
- `src/app/content/layout.tsx` - UPDATED: Add Alchemy navigation link
