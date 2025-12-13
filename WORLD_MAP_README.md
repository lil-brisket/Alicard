# World Map System

## Overview

The World Map system provides a 2D grid-based exploration system where players can move around a persistent world. The map is stored in the database and persists across sessions.

## Architecture

### Database Models

- **World**: Represents a game world with width and height dimensions
- **MapTile**: Individual tiles within a world, each with coordinates (x, y), tile type, zone type, and metadata
- **MapPosition**: Tracks each player's current position in a world

### Key Features

1. **Grid-based Map**: 20x20 grid (configurable via World model)
2. **Player Position Tracking**: Position persists in database
3. **Movement Controls**: N/S/E/W directional movement with server-side validation
4. **Tile Types**: PLAIN, ROAD, FOREST, WATER, TOWN, and more
5. **Collision Detection**: Water tiles block movement
6. **Boundary Validation**: Server prevents movement outside world boundaries

## Usage

### Accessing the Map

Navigate to `/world-map` from the hub navigation menu.

### Movement

Use the directional buttons (North, South, East, West) to move your character. Movement is validated server-side to ensure:
- You stay within world boundaries
- You cannot move onto water tiles
- Position updates are persisted to the database

### Tile Types

- **PLAIN**: Grassy plains (green)
- **ROAD**: Well-traveled roads (amber)
- **FOREST**: Dense forests (dark green)
- **WATER**: Water tiles that block movement (blue)
- **TOWN**: Safe town areas (gray)
- **RIVER**: Flowing rivers (light blue, blocks movement)
- And more...

## Customization

### Adjusting Map Size

To change the world size, update the `World` model in the database:

```typescript
// Update default world dimensions
await prisma.world.update({
  where: { id: "default-world" },
  data: {
    width: 30,  // Change from 20
    height: 30, // Change from 20
  },
});
```

Then regenerate tiles using the seed script or create new tiles programmatically.

### Adding/Modifying Tile Types

1. **Add to Enum**: Update `TileType` enum in `prisma/schema.prisma`:
   ```prisma
   enum TileType {
     // ... existing types
     NEW_TYPE
   }
   ```

2. **Update Styling**: Add colors and icons in `src/app/world-map/_components/tile-cell.tsx`:
   ```typescript
   const tileTypeColors: Record<string, string> = {
     // ... existing colors
     NEW_TYPE: "bg-purple-500",
   };
   
   const tileTypeIcons: Record<string, string> = {
     // ... existing icons
     NEW_TYPE: "🌟",
   };
   ```

3. **Update Movement Logic**: Modify `src/server/api/routers/player.ts` `move` procedure if the new tile type should block movement:
   ```typescript
   if (targetTile.tileType === "WATER" || targetTile.tileType === "NEW_TYPE") {
     throw new TRPCError({
       code: "BAD_REQUEST",
       message: "Cannot move onto this tile type",
     });
   }
   ```

4. **Run Migration**: Create and apply a Prisma migration:
   ```bash
   npx prisma migrate dev --name add_new_tile_type
   ```

### Seeding a New World

The seed script (`prisma/seed.ts`) creates a default 20x20 world with:
- Town center at (10, 10)
- Roads around the town
- Water areas in specific regions
- Forest areas in corners
- Mostly plain/grass tiles elsewhere

To customize the world generation, modify the tile generation logic in `prisma/seed.ts`.

## API Endpoints

### tRPC Procedures

- **`world.getActiveWorld`**: Returns the active world with all tiles
- **`player.getPosition`**: Returns the current player's position (spawns at (10, 10) if none exists)
- **`player.move`**: Moves the player in the specified direction (north, south, east, west)

## Future Enhancements

The system is designed to support:
- Random encounters (PvE/PvP zones)
- Gathering nodes spawning on tiles
- Travel restrictions (bridges/boats for water)
- Stamina cost for movement
- Fog of war (only show tiles within radius)
- Zone tags (Safe, PvP, Dungeon, High Risk)
- Tile hover/click panels with descriptions

## Technical Notes

- Map tiles are stored in the database, not hardcoded in the frontend
- This allows for admin/content panels to edit tiles without code changes
- Server-side validation ensures clients cannot bypass movement restrictions
- Position is automatically created at (10, 10) if a player has no position
