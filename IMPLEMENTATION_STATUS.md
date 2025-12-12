# Project Alicard - Implementation Status

## Phase 1: Foundation ✅ COMPLETE

### ✅ Database Schema
- Complete Prisma schema with all game systems:
  - Player, Stats, Inventory, Items, Equipment
  - Map System (Tiles, Positions, Zones)
  - Combat System (Encounters, Combat Logs)
  - Death & Permadeath System
  - Occupations (Primary & Secondary)
  - Guilds, Banking, Market
  - NPCs, Quests, Shops

### ✅ Player Creation System
- Character creation with stat allocation
- Starting stats: 40 points across 4 stats (Vitality, Strength, Speed, Dexterity)
- Automatic HP/SP calculation based on stats
- Starting position in safe zone
- Bank account creation
- Equipment slot initialization

**API Endpoints:**
- `player.getCurrent` - Get current player character
- `player.create` - Create new character
- `player.allocateStats` - Allocate stat points on level up
- `player.getStats` - Get player stats

### ✅ 2D Grid Map System
- Tile-based world map
- Dynamic tile generation
- Zone types: SAFE, LOW_DANGER, MEDIUM_DANGER, HIGH_DANGER, EXTREME_DANGER
- Tile types: GRASS, FOREST, MOUNTAIN, RIVER, DESERT, DUNGEON, TOWN, SHRINE, ROAD
- Movement in 4 directions (north, south, east, west)
- Random encounter system based on zone danger
- Resource nodes on tiles

**API Endpoints:**
- `map.getCurrentPosition` - Get player's current position
- `map.getSurroundingTiles` - Get tiles in radius around player
- `map.move` - Move player to adjacent tile
- `map.getTile` - Get specific tile by coordinates

### ✅ Turn-Based Combat System
- Turn order based on Speed stat
- Combat actions: Attack, Skill, Defend, Item, Escape
- Damage calculation with defense mitigation
- Stamina (SP) system for skills
- Combat log with detailed turn-by-turn results
- Enemy types: Wolf, Goblin, Bandit, Skeleton, Orc
- Experience and gold rewards on victory
- Death handling with respawn in nearest town

**API Endpoints:**
- `combat.startCombat` - Initialize combat with encounter
- `combat.executeAction` - Execute player action in combat
- `combat.getCombatLog` - Get full combat log

### ✅ Permadeath System
- Death counter tracking
- Automatic respawn in nearest town after death
- HP/SP restored to 50% on death
- After 5 deaths: Account permanently deleted
- Death logs for tracking

### ✅ Battle MVP System
- Minimal PvE turn-based battle system with DB persistence
- Monster templates (content) stored in database
- Battle instances (runtime) with HP/SP snapshots
- Simple damage formula: `max(1, attackerStr - floor(defenderVit/2) + rand(0..2))`
- Turn-based combat: player attack → monster attack per turn
- Battle states: ACTIVE, WON, LOST, FLED
- XP and gold rewards on victory
- Battle log stored as JSON array

**Database Models:**
- `Monster` - Template with name, level, stats, rewards
- `Battle` - Instance with userId, monsterId, HP/SP snapshots, status, log
- `BattleStatus` enum: ACTIVE, WON, LOST, FLED

**API Endpoints:**
- `battle.listMonsters` - List all available monster templates
- `battle.startBattle` - Create new battle, snapshot player HP/SP
- `battle.getActiveBattle` - Get current active battle for user
- `battle.attack` - Execute one full turn (player + monster attacks)
- `battle.flee` - End battle by fleeing

**UI:**
- Combat page shows monster selection when no active battle
- Active battle view with HP bars, battle log, Attack/Flee buttons
- Real-time battle state updates

**Monsters (Seeded):**
- Slime (Level 1) - 20 HP, 10 XP, 5 gold
- Wolf (Level 3) - 35 HP, 30 XP, 15 gold
- Bandit (Level 5) - 50 HP, 50 XP, 25 gold

**Testing:**
1. Run database migration: `npx prisma migrate dev --name add_battle_system`
2. Run seed: `npm run db:seed` (or `npx prisma db seed`)
3. Navigate to `/combat` page
4. Select a monster and start battle
5. Use Attack button to fight
6. Win grants XP and gold, loss ends battle
7. Flee option available at any time

## Phase 2: Persistence (In Progress)

### Pending:
- [ ] Database migration and setup
- [ ] Basic market system
- [ ] Inventory & item system (CRUD operations)
- [ ] Item creation and management

## Phase 3: Core Systems (Pending)

### Occupations
- [ ] Primary occupations: Blacksmith, Alchemist, Cook, Tailor, Merchant, Beast Handler
- [ ] Secondary occupations: Miner, Herbalist, Fisher, Logger, Forager
- [ ] Occupation leveling and progression
- [ ] Occupation-specific skills and abilities

### Banking
- [ ] Gold deposits and withdrawals
- [ ] 5% withdrawal tax
- [ ] Item vaulting system
- [ ] Vault level upgrades

### Guilds
- [ ] Guild creation and management
- [ ] Shared guild bank
- [ ] Guild quests
- [ ] Member roles (Leader, Officer, Member)

## Phase 4: Expansion (Pending)

- [ ] Multiple biomes
- [ ] Dungeons
- [ ] More enemy types
- [ ] Season resets

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe APIs
- **Auth**: NextAuth.js
- **Language**: TypeScript

## Next Steps

1. Run database migration: `npm run db:generate`
2. Create initial game UI components
3. Implement inventory system
4. Add NPC system with towns
5. Build market UI
6. Create occupation selection UI

## API Structure

All game APIs are organized under tRPC routers:
- `player.*` - Player character management
- `map.*` - World map and movement
- `combat.*` - Turn-based combat (encounter-based)
- `battle.*` - Battle MVP (monster template-based)
- (Future: `inventory.*`, `market.*`, `guild.*`, `bank.*`, `occupation.*`)

