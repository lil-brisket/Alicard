# GAME DESIGN DOCUMENT — "PROJECT ALICARD"
## Turn-Based MMO RPG, 2D Map, Text-Driven

---

## 1. High-Level Concept

**Status:** ✅ **DEFINED**

- **Genre:** Turn-based MMO RPG, Text-driven
- **World:** 2D top-down grid map (exploration and travel)
- **Combat:** Turn-based, menu-driven
- **Core Systems:** Occupations, guilds, permadeath, player economy, banking, trading
- **Platform:** Web + Mobile (T3 stack)
- **Style:** Lightweight, low-art, system-heavy, SAO-inspired world structure but not a VR setting

---

## 2. Design Pillars

**Status:** ✅ **DEFINED**

- **Player-driven world** — trading, crafting, markets, guild politics.
- **Harsh but meaningful progression** — permadeath after 5 deaths adds real tension.
- **Text-first design** — story, events, combat logs, NPC interactions through rich text.
- **Turn-based strategy combat** — fair, readable, skill-based decision-making.
- **Simple stat system** — easy for players and developers to understand.

---

## 3. Core Stats & Pools

**Status:** ✅ **IMPLEMENTED**

### 3.1 Base Stats
| Stat | Purpose | Status |
|------|---------|--------|
| Vitality | Max HP, resistance to damage. | ✅ Implemented |
| Strength | Affects physical damage dealt. | ✅ Implemented |
| Speed | Determines turn order and run chance. | ✅ Implemented |
| Dexterity | Affects accuracy, critical rate, evasion, gathering quality. | ✅ Implemented |

### 3.2 Resource Pools
| Pool | Purpose | Status |
|------|---------|--------|
| Health (HP) | Damage taken = loss of HP. Reaches 0 → death counter + revive in town. | ✅ Implemented |
| Stamina (SP) | Limits skill usage; recovering stamina takes time or resting. | ✅ Implemented |

**Implementation Details:**
- HP calculation: `50 + (Vitality × 5)`
- SP calculation: `20 + (Vitality × 2) + (Speed × 1)`
- Starting stat points: 40 total across 4 stats
- Stat allocation system with validation

---

## 4. Permadeath System

**Status:** ✅ **IMPLEMENTED**

### 4.1 Death Counter
- ✅ Each time HP reaches 0 → +1 Death
- ✅ After each death, the player wakes in the nearest town or shrine with a penalty
- ✅ HP/SP restored to 50% on respawn

### 4.2 Permanent Death Rules
- ✅ After 5 total deaths → Account deleted (`isDeleted = true`)
- ✅ Name freed for reuse
- ✅ All items, gold, properties lost (via cascade delete)
- ✅ Death logs tracked in database

### 4.3 UI Feedback
- ⏳ Before each death after 3: Red warning text "You feel your life force weakening..."
- ⏳ At death 5: Data wiped, Account redirected to "New Character" screen

**Implementation:**
- Death counter tracked in `Player.deathCount`
- Death logs stored in `DeathLog` model
- Automatic respawn in nearest safe zone (town)
- Account deletion after 5 deaths

---

## 5. Gameplay Loop

**Status:** ⏳ **PARTIALLY IMPLEMENTED**

### 5.1 Daily Player Loop
- ✅ Log in → Check guild, mail, market changes (login/auth ready)
- ✅ Travel on the 2D world map (movement system implemented)
- ✅ Engage in battles or gathering (combat implemented, gathering pending)
- ✅ Return to a safe zone (safe zones implemented)
- ⏳ Craft items or trade (pending)
- ⏳ Bank valuables (risk management) (banking system pending)
- ✅ Repeat

---

## 6. World & Map Structure

**Status:** ✅ **IMPLEMENTED**

### 6.1 2D Grid Map
- ✅ Top-down tile map
- ✅ Safe zones (towns, outposts)
- ✅ Resource nodes (forests, rivers, mines)
- ✅ Danger zones (higher mob threat)
- ✅ Special areas (dungeons, shrines)

**Tile Types Implemented:**
- GRASS, FOREST, MOUNTAIN, RIVER, DESERT, DUNGEON, TOWN, SHRINE, ROAD

**Zone Types Implemented:**
- SAFE, LOW_DANGER, MEDIUM_DANGER, HIGH_DANGER, EXTREME_DANGER

### 6.2 Travel
- ✅ Movement is step-based
- ✅ Random encounters triggered by tile type
- ✅ Speed stat influences "encounter reduction" slightly
- ✅ Dynamic tile generation when exploring new areas

**API Endpoints:**
- `map.getCurrentPosition` - Get player's current position
- `map.getSurroundingTiles` - Get tiles in radius around player
- `map.move` - Move player (north, south, east, west)
- `map.getTile` - Get specific tile by coordinates

---

## 7. Combat System — Turn Based

**Status:** ✅ **IMPLEMENTED**

### 7.1 Turn Order
- ✅ Turn order = Based on Speed stat
- ✅ Enemies and players act in a queue

### 7.2 Actions
Players can:
- ✅ Attack
- ✅ Use Skill (costs stamina)
- ✅ Defend
- ⏳ Use Item (pending item system)
- ✅ Attempt Escape (Speed vs enemy Speed)

### 7.3 Skills
- ✅ Universal basic skills (Power Strike implemented)
- ⏳ Occupation-based skills (pending occupation system)
- ⏳ Weapon-based skills (can be added later)

**Implemented Skills:**
- **Power Strike** (STR scaling, +High Stamina Cost) - 10 SP cost, 1.5x damage multiplier

**Combat Features:**
- Damage calculation with defense mitigation
- Random variance (±20%) for damage
- Escape chance based on speed difference
- Detailed combat logs with turn-by-turn results
- Experience and gold rewards on victory

**Enemy Types:**
- Wolf, Goblin, Bandit, Skeleton, Orc
- Enemy stats scale with level

**API Endpoints:**
- `combat.startCombat` - Initialize combat with encounter
- `combat.executeAction` - Execute player action (attack, skill, defend, escape)
- `combat.getCombatLog` - Get full combat log

---

## 8. Occupations (Core System)

**Status:** ⏳ **SCHEMA READY, LOGIC PENDING**

### Primary Occupations
| Occupation | Purpose | Status |
|------------|---------|--------|
| Blacksmith | Creates weapons/armor. | ⏳ Schema ready |
| Alchemist | Creates potions/bombs. | ⏳ Schema ready |
| Cook | Makes meals that boost stats temporarily. | ⏳ Schema ready |
| Tailor | Makes light armor & accessories. | ⏳ Schema ready |
| Merchant | Gains trading advantages + runs stalls. | ⏳ Schema ready |
| Beast Handler | Tames small creatures for buffs (non-combat if you want simplicity). | ⏳ Schema ready |

### Secondary Occupations (Gathering)
| Occupation | Purpose | Status |
|------------|---------|--------|
| Miner | Ore for smithing. | ⏳ Schema ready |
| Herbalist | Herbs for alchemists. | ⏳ Schema ready |
| Fisher | Food & alchemy materials. | ⏳ Schema ready |
| Logger | Wood for bows, tools. | ⏳ Schema ready |
| Forager | High chance to find rare items in nature. | ⏳ Schema ready |

**Database Schema:**
- `Occupation` model created
- `PrimaryOccupation` enum defined
- `SecondaryOccupation` enum defined
- Occupation leveling and experience tracking ready

**Pending:**
- Occupation selection during character creation
- Occupation-specific skills and abilities
- Crafting systems for each occupation
- Gathering mechanics for secondary occupations

---

## 9. Player Economy & Systems

**Status:** ⏳ **SCHEMA READY, LOGIC PENDING**

### 9.1 Trading
- ⏳ Direct trades
- ⏳ Secure trade UI
- ⏳ Optional price suggestions to prevent scams

### 9.2 Market (Player-Driven)
- ✅ Database schema for auction house/market board
- ⏳ Sellers pay a listing tax
- ⏳ Items have rising/falling market value based on supply
- ⏳ Market UI and trading logic

**Database Schema:**
- `MarketListing` model created
- `MarketTransaction` model created
- Listing tax field ready

### 9.3 Guild System
- ✅ Database schema for guilds
- ⏳ Guilds offer:
  - ⏳ Shared bank
  - ⏳ Guild quests
  - ⏳ Player protection
  - ⏳ Influence over economy in "regions"

**Database Schema:**
- `Guild` model created
- `GuildMember` model created
- `GuildBank` model created
- `GuildQuest` model created
- Guild roles (LEADER, OFFICER, MEMBER) defined

### 9.4 Banking System
- ✅ Database schema for banking
- ⏳ Banks allow:
  - ⏳ Gold deposit
  - ⏳ Item vaulting
  - ⏳ Limited storage per level
  - ⏳ 5% withdrawal tax to fight inflation

**Database Schema:**
- `BankAccount` model created
- `BankVaultItem` model created
- Vault level system ready

---

## 10. NPCs & Interaction

**Status:** ⏳ **SCHEMA READY, LOGIC PENDING**

Since this is text-heavy, NPCs provide:
- ⏳ Quests
- ⏳ Lore
- ⏳ Shops
- ⏳ Travel hints
- ⏳ Training tutorials
- ⏳ Banking / market access

**Database Schema:**
- `NPC` model created
- `ShopItem` model created
- `Quest` model created
- NPC types: MERCHANT, QUEST_GIVER, TRAINER, BANKER, GUILD_MASTER, GUARD, TAVERN_KEEPER

**Pending:**
- NPC dialogue system
- Shop interactions
- Quest system implementation
- Dynamic NPC text (static JSON or AI-generated)

---

## 11. Progression

**Status:** ✅ **PARTIALLY IMPLEMENTED**

### Player Level
- ✅ Gives points to spend in the four core stats
- ✅ Stat allocation system implemented
- ⏳ Level-up experience thresholds
- ⏳ Level-based unlocks

### Skill Progression
- ✅ Database schema for skills
- ⏳ Basic skill improvements
- ⏳ Weapon familiarity (light system)
- ⏳ Occupation levels

**Database Schema:**
- `PlayerSkill` model created
- Skill leveling and experience tracking ready

### Equipment Tier Progression
- ✅ Database schema for items and equipment
- ⏳ Tiers 1–5, each tied to map zones
- ⏳ Equipment stat bonuses system

**Database Schema:**
- `Item` model with tier system (1-5)
- `Equipment` model with all slots
- Equipment stat bonuses (vitality, strength, speed, dexterity, HP, SP)

---

## 12. UI & Text Systems

**Status:** ⏳ **PENDING**

Since the game is text-oriented:

### Important UI Elements
- ⏳ Combat Log (the heart of your turn-based combat) - *Backend ready, UI pending*
- ⏳ Chat Log (Global, Guild, Local)
- ⏳ Market UI
- ⏳ Inventory & Equipment
- ⏳ World Map (Grid)
- ⏳ Danger Warnings

### Combat Log Example
```
[Turn 1] The Wolf leaps at you!
• Wolf attacks → You take 4 damage. (HP: 22/26)
• You strike back → 6 damage dealt. (Wolf HP: 14/20)
```

**Backend Status:**
- ✅ Combat log data structure implemented
- ✅ Turn-by-turn combat results stored
- ⏳ UI components for displaying logs

---

## 13. Technical Considerations (T3 Stack)

**Status:** ✅ **IMPLEMENTED**

### Client (Next.js)
- ✅ Next.js 15 with App Router
- ⏳ Map rendering
- ⏳ Combat UI
- ⏳ Chat + logs
- ⏳ Market screens

### Server (tRPC + WebSockets)
- ✅ tRPC setup complete
- ✅ Combat calculations
- ✅ Player movement
- ⏳ NPC/market logic
- ⏳ Inventory transactions
- ⏳ Permadeath enforcement (✅ backend ready)

### Database (Prisma + PostgreSQL)
- ✅ Prisma schema complete
- ✅ Tables needed:
  - ✅ players
  - ✅ stats
  - ✅ inventory
  - ✅ items
  - ✅ markets
  - ✅ guilds
  - ✅ bank_accounts
  - ✅ death_logs
  - ✅ combat_logs
  - ✅ map_tiles
  - ✅ npc_data

**Current API Routers:**
- `player.*` - Player character management
- `map.*` - World map and movement
- `combat.*` - Turn-based combat

---

## 14. Roadmap Based on Your Skill Level

### Phase 1 — Foundation ✅ **COMPLETE**

- ✅ Build movement system on 2D map
- ✅ Player creation + stats
- ✅ Basic NPC + town (schema ready, interactions pending)
- ✅ Basic combat prototype (1 enemy type) - *Multiple enemy types implemented*

### Phase 2 — Persistence ⏳ **IN PROGRESS**

- ✅ Database for characters
- ⏳ Basic market
- ⏳ Inventory & item system (schema ready, CRUD pending)
- ✅ Death counter + permadeath logic

### Phase 3 — Core Systems ⏳ **PENDING**

- ⏳ Occupations (start with 1–2)
- ⏳ Banking
- ⏳ Guilds
- ⏳ More enemy types + zones (enemy types done, zones done)

### Phase 4 — Expansion ⏳ **PENDING**

- ⏳ Multiple biomes
- ⏳ Dungeons
- ⏳ More occupations
- ⏳ Season resets

---

## Implementation Summary

### ✅ Completed Systems
1. **Database Schema** - Complete Prisma schema for all game systems
2. **Player Creation** - Character creation with stat allocation
3. **2D Map System** - Tile-based world with movement and encounters
4. **Combat System** - Turn-based combat with actions and logs
5. **Permadeath System** - Death counter and account deletion
6. **Core Stats** - All 4 stats with HP/SP calculations

### ⏳ Schema Ready, Logic Pending
1. **Inventory System** - Database ready, CRUD operations needed
2. **Equipment System** - Database ready, equip/unequip logic needed
3. **Market System** - Database ready, trading logic needed
4. **Banking System** - Database ready, deposit/withdraw logic needed
5. **Guild System** - Database ready, guild management needed
6. **Occupation System** - Database ready, occupation selection and skills needed
7. **NPC System** - Database ready, interactions needed
8. **Quest System** - Database ready, quest logic needed

### ⏳ Not Started
1. **UI Components** - All frontend UI pending
2. **Chat System** - Global, guild, local chat
3. **Item Creation** - Item generation and management
4. **Crafting Systems** - Occupation-based crafting
5. **Gathering Systems** - Resource collection mechanics

---

## Next Steps

1. **Run Database Migration**
   ```bash
   npm run db:generate
   ```
   
   **Note:** This project uses migrations exclusively. Never use `prisma db push`.

2. **Implement Inventory System**
   - Add/remove items
   - Stack management
   - Item usage

3. **Implement Equipment System**
   - Equip/unequip items
   - Stat bonus calculation (partially done)
   - Equipment UI

4. **Create Basic UI Components**
   - Character creation screen
   - Map view
   - Combat interface
   - Inventory display

5. **Implement NPC Interactions**
   - Dialogue system
   - Shop system
   - Quest givers

---

## Legend

- ✅ **Implemented** - Fully functional and tested
- ⏳ **Pending** - Not yet implemented or partially complete
- 🗄️ **Schema Ready** - Database structure exists, logic needed

---

*Last Updated: Based on current implementation status*

