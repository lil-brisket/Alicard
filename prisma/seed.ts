import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Load environment variables from .env file
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Please check your .env file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting seed...");

  // Create default world (20x20)
  console.log("Creating default world...");
  const defaultWorld = await prisma.world.upsert({
    where: { id: "default-world" },
    update: {},
    create: {
      id: "default-world",
      name: "Alicard",
      width: 20,
      height: 20,
    },
  });

  // Generate tiles for the world
  console.log("Generating tiles for world...");
  const tiles: Array<{
    worldId: string;
    x: number;
    y: number;
    tileType: "GRASS" | "FOREST" | "MOUNTAIN" | "RIVER" | "DESERT" | "DUNGEON" | "TOWN" | "SHRINE" | "ROAD" | "PLAIN" | "WATER";
    zoneType: "SAFE" | "LOW_DANGER" | "MEDIUM_DANGER" | "HIGH_DANGER" | "EXTREME_DANGER";
    isSafeZone: boolean;
    description: string;
  }> = [];

  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      // Center town at (10, 10)
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - 10, 2) + Math.pow(y - 10, 2)
      );

      let tileType: "GRASS" | "FOREST" | "MOUNTAIN" | "RIVER" | "DESERT" | "DUNGEON" | "TOWN" | "SHRINE" | "ROAD" | "PLAIN" | "WATER";
      let zoneType: "SAFE" | "LOW_DANGER" | "MEDIUM_DANGER" | "HIGH_DANGER" | "EXTREME_DANGER";
      let isSafeZone: boolean;
      let description: string;

      if (distanceFromCenter < 2) {
        // Town center
        tileType = "TOWN";
        zoneType = "SAFE";
        isSafeZone = true;
        description = "Town Square";
      } else if (distanceFromCenter < 3) {
        // Road around town
        tileType = "ROAD";
        zoneType = "SAFE";
        isSafeZone = true;
        description = "Town Road";
      } else if (
        (x >= 5 && x <= 8 && y >= 5 && y <= 8) ||
        (x >= 12 && x <= 15 && y >= 12 && y <= 15)
      ) {
        // Water areas
        tileType = "WATER";
        zoneType = "LOW_DANGER";
        isSafeZone = false;
        description = "Shallow Water";
      } else if (
        (x >= 2 && x <= 6 && y >= 2 && y <= 6) ||
        (x >= 14 && x <= 18 && y >= 14 && y <= 18)
      ) {
        // Forest areas
        tileType = "FOREST";
        zoneType = distanceFromCenter < 8 ? "LOW_DANGER" : "MEDIUM_DANGER";
        isSafeZone = false;
        description = "Dense Forest";
      } else {
        // Mostly plain/grass
        tileType = distanceFromCenter < 5 ? "ROAD" : "PLAIN";
        zoneType =
          distanceFromCenter < 5
            ? "SAFE"
            : distanceFromCenter < 10
            ? "LOW_DANGER"
            : "MEDIUM_DANGER";
        isSafeZone = distanceFromCenter < 5;
        description =
          tileType === "ROAD" ? "Well-traveled Road" : "Grassy Plain";
      }

      tiles.push({
        worldId: defaultWorld.id,
        x,
        y,
        tileType,
        zoneType,
        isSafeZone,
        description,
      });
    }
  }

  // Batch create tiles (in chunks to avoid overwhelming the DB)
  const chunkSize = 100;
  for (let i = 0; i < tiles.length; i += chunkSize) {
    const chunk = tiles.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((tile) =>
        prisma.mapTile.upsert({
          where: {
            worldId_x_y: {
              worldId: tile.worldId,
              x: tile.x,
              y: tile.y,
            },
          },
          update: {},
          create: tile,
        })
      )
    );
  }

  console.log(`✅ Created ${tiles.length} tiles for world`);

  // Create base jobs
  const jobs = [
    {
      key: "blacksmith",
      name: "Blacksmith",
      description: "Forge weapons and armor from metal and materials.",
      category: "CRAFT" as const,
    },
    {
      key: "tailor",
      name: "Tailor",
      description: "Craft clothing and fabric-based equipment.",
      category: "CRAFT" as const,
    },
    {
      key: "alchemist",
      name: "Alchemist",
      description: "Create potions and magical consumables.",
      category: "CRAFT" as const,
    },
    {
      key: "cook",
      name: "Cook",
      description: "Prepare food items that restore health and stamina.",
      category: "CRAFT" as const,
    },
    {
      key: "crafting",
      name: "Crafting",
      description: "General crafting profession for creating various items.",
      category: "CRAFT" as const,
    },
    {
      key: "miner",
      name: "Miner",
      description: "Extract ores and minerals from mining nodes.",
      category: "GATHER" as const,
    },
    {
      key: "fisher",
      name: "Fisher",
      description: "Catch fish from fishing spots.",
      category: "GATHER" as const,
    },
    {
      key: "herbalist",
      name: "Herbalist",
      description: "Gather herbs and plants from nature.",
      category: "GATHER" as const,
    },
    {
      key: "logger",
      name: "Logger",
      description: "Harvest wood from trees and logs.",
      category: "GATHER" as const,
    },
  ];

  console.log("Creating jobs...");
  for (const jobData of jobs) {
    await prisma.job.upsert({
      where: { key: jobData.key },
      update: {},
      create: jobData,
    });
  }

  // Create base items
  console.log("Creating items...");

  // Materials
  const ironOre = await prisma.item.upsert({
    where: { id: "iron-ore" },
    update: {},
    create: {
      id: "iron-ore",
      key: "iron-ore",
      name: "Iron Ore",
      description: "A chunk of raw iron ore.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 10,
      stackable: true,
      maxStack: 99,
    },
  });

  const copperOre = await prisma.item.upsert({
    where: { id: "copper-ore" },
    update: {},
    create: {
      id: "copper-ore",
      name: "Copper Ore",
      description: "A chunk of raw copper ore.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 5,
      stackable: true,
      maxStack: 99,
    },
  });

  // Mining items - Tier 1
  const stone = await prisma.item.upsert({
    where: { id: "stone" },
    update: {},
    create: {
      id: "stone",
      key: "stone",
      name: "Stone",
      description: "Common stone used for basic construction.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 1,
      stackable: true,
      maxStack: 99,
    },
  });

  const tinOre = await prisma.item.upsert({
    where: { id: "tin-ore" },
    update: {},
    create: {
      id: "tin-ore",
      key: "tin-ore",
      name: "Tin Ore",
      description: "A chunk of raw tin ore.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  const coal = await prisma.item.upsert({
    where: { id: "coal" },
    update: {},
    create: {
      id: "coal",
      key: "coal",
      name: "Coal",
      description: "A chunk of coal used for smelting.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 8,
      stackable: true,
      maxStack: 99,
    },
  });

  // Mining items - Tier 2
  const silverOre = await prisma.item.upsert({
    where: { id: "silver-ore" },
    update: {},
    create: {
      id: "silver-ore",
      key: "silver-ore",
      name: "Silver Ore",
      description: "A chunk of raw silver ore.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 25,
      stackable: true,
      maxStack: 99,
    },
  });

  const goldOre = await prisma.item.upsert({
    where: { id: "gold-ore" },
    update: {},
    create: {
      id: "gold-ore",
      key: "gold-ore",
      name: "Gold Ore",
      description: "A chunk of raw gold ore.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 35,
      stackable: true,
      maxStack: 99,
    },
  });

  const quartz = await prisma.item.upsert({
    where: { id: "quartz" },
    update: {},
    create: {
      id: "quartz",
      key: "quartz",
      name: "Quartz",
      description: "A crystal of quartz.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 30,
      stackable: true,
      maxStack: 99,
    },
  });

  const platinumOre = await prisma.item.upsert({
    where: { id: "platinum-ore" },
    update: {},
    create: {
      id: "platinum-ore",
      key: "platinum-ore",
      name: "Platinum Ore",
      description: "A chunk of raw platinum ore.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 40,
      stackable: true,
      maxStack: 99,
    },
  });

  const sulfur = await prisma.item.upsert({
    where: { id: "sulfur" },
    update: {},
    create: {
      id: "sulfur",
      key: "sulfur",
      name: "Sulfur",
      description: "Crystalline sulfur used in alchemy.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 32,
      stackable: true,
      maxStack: 99,
    },
  });

  // Mining items - Tier 3
  const denseIronOre = await prisma.item.upsert({
    where: { id: "dense-iron-ore" },
    update: {},
    create: {
      id: "dense-iron-ore",
      key: "dense-iron-ore",
      name: "Dense Iron Ore",
      description: "A high-quality chunk of dense iron ore.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 60,
      stackable: true,
      maxStack: 99,
    },
  });

  const deepSilverOre = await prisma.item.upsert({
    where: { id: "deep-silver-ore" },
    update: {},
    create: {
      id: "deep-silver-ore",
      key: "deep-silver-ore",
      name: "Deep Silver Ore",
      description: "Silver ore from deep underground veins.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 75,
      stackable: true,
      maxStack: 99,
    },
  });

  const geodeCrystal = await prisma.item.upsert({
    where: { id: "geode-crystal" },
    update: {},
    create: {
      id: "geode-crystal",
      key: "geode-crystal",
      name: "Geode Crystal",
      description: "A crystalline formation from a geode.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 85,
      stackable: true,
      maxStack: 99,
    },
  });

  const obsidian = await prisma.item.upsert({
    where: { id: "obsidian" },
    update: {},
    create: {
      id: "obsidian",
      key: "obsidian",
      name: "Obsidian",
      description: "Volcanic glass with a sharp edge.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 90,
      stackable: true,
      maxStack: 99,
    },
  });

  const blackstoneOre = await prisma.item.upsert({
    where: { id: "blackstone-ore" },
    update: {},
    create: {
      id: "blackstone-ore",
      key: "blackstone-ore",
      name: "Blackstone Ore",
      description: "A dark, dense ore with mysterious properties.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 95,
      stackable: true,
      maxStack: 99,
    },
  });

  // Mining items - Tier 4
  const mithrilOre = await prisma.item.upsert({
    where: { id: "mithril-ore" },
    update: {},
    create: {
      id: "mithril-ore",
      key: "mithril-ore",
      name: "Mithril Ore",
      description: "A rare, lightweight ore with magical properties.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 150,
      stackable: true,
      maxStack: 99,
    },
  });

  const adamantiteOre = await prisma.item.upsert({
    where: { id: "adamantite-ore" },
    update: {},
    create: {
      id: "adamantite-ore",
      key: "adamantite-ore",
      name: "Adamantite Ore",
      description: "An extremely hard and durable ore.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 180,
      stackable: true,
      maxStack: 99,
    },
  });

  const runestone = await prisma.item.upsert({
    where: { id: "runestone" },
    update: {},
    create: {
      id: "runestone",
      key: "runestone",
      name: "Runestone",
      description: "A stone inscribed with ancient runes.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 200,
      stackable: true,
      maxStack: 99,
    },
  });

  const bloodIronOre = await prisma.item.upsert({
    where: { id: "blood-iron-ore" },
    update: {},
    create: {
      id: "blood-iron-ore",
      key: "blood-iron-ore",
      name: "Blood-Iron Ore",
      description: "Iron ore with a deep crimson hue.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 220,
      stackable: true,
      maxStack: 99,
    },
  });

  const tempestCrystal = await prisma.item.upsert({
    where: { id: "tempest-crystal" },
    update: {},
    create: {
      id: "tempest-crystal",
      key: "tempest-crystal",
      name: "Tempest Crystal",
      description: "A crystal that crackles with elemental energy.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 240,
      stackable: true,
      maxStack: 99,
    },
  });

  // Mining items - Tier 5
  const voidQuartz = await prisma.item.upsert({
    where: { id: "void-quartz" },
    update: {},
    create: {
      id: "void-quartz",
      key: "void-quartz",
      name: "Void Quartz",
      description: "A quartz crystal that seems to absorb light.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 400,
      stackable: true,
      maxStack: 99,
    },
  });

  const starMetal = await prisma.item.upsert({
    where: { id: "star-metal" },
    update: {},
    create: {
      id: "star-metal",
      key: "star-metal",
      name: "Star-Metal",
      description: "Metal that fell from the stars.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 500,
      stackable: true,
      maxStack: 99,
    },
  });

  const celestialMithril = await prisma.item.upsert({
    where: { id: "celestial-mithril" },
    update: {},
    create: {
      id: "celestial-mithril",
      key: "celestial-mithril",
      name: "Celestial Mithril",
      description: "Mithril blessed by celestial forces.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 600,
      stackable: true,
      maxStack: 99,
    },
  });

  const abyssalAdamantite = await prisma.item.upsert({
    where: { id: "abyssal-adamantite" },
    update: {},
    create: {
      id: "abyssal-adamantite",
      key: "abyssal-adamantite",
      name: "Abyssal Adamantite",
      description: "Adamantite forged in the depths of the abyss.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 700,
      stackable: true,
      maxStack: 99,
    },
  });

  const worldcoreOre = await prisma.item.upsert({
    where: { id: "worldcore-ore" },
    update: {},
    create: {
      id: "worldcore-ore",
      key: "worldcore-ore",
      name: "Worldcore Ore",
      description: "Ore from the very heart of the world.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 1000,
      stackable: true,
      maxStack: 99,
    },
  });

  const cloth = await prisma.item.upsert({
    where: { id: "cloth" },
    update: {},
    create: {
      id: "cloth",
      name: "Cloth",
      description: "Basic fabric material.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 3,
      stackable: true,
      maxStack: 99,
    },
  });

  const leather = await prisma.item.upsert({
    where: { id: "leather" },
    update: {},
    create: {
      id: "leather",
      name: "Leather",
      description: "Tanned animal hide.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 8,
      stackable: true,
      maxStack: 99,
    },
  });

  const herb = await prisma.item.upsert({
    where: { id: "herb" },
    update: {},
    create: {
      id: "herb",
      name: "Herb",
      description: "A common medicinal herb.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 4,
      stackable: true,
      maxStack: 99,
    },
  });

  // Herbalist items - Tier 1
  const meadowleaf = await prisma.item.upsert({
    where: { id: "meadowleaf" },
    update: {},
    create: {
      id: "meadowleaf",
      key: "meadowleaf",
      name: "Meadowleaf",
      description: "A common herb found in peaceful meadows.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 5,
      stackable: true,
      maxStack: 99,
    },
  });

  const wildmint = await prisma.item.upsert({
    where: { id: "wildmint" },
    update: {},
    create: {
      id: "wildmint",
      key: "wildmint",
      name: "Wildmint",
      description: "Fresh wild mint with a refreshing aroma.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  const bitterroot = await prisma.item.upsert({
    where: { id: "bitterroot" },
    update: {},
    create: {
      id: "bitterroot",
      key: "bitterroot",
      name: "Bitterroot",
      description: "A bitter root used in alchemy.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 7,
      stackable: true,
      maxStack: 99,
    },
  });

  const sunblossom = await prisma.item.upsert({
    where: { id: "sunblossom" },
    update: {},
    create: {
      id: "sunblossom",
      key: "sunblossom",
      name: "Sunblossom",
      description: "A bright flower that thrives in sunlight.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 8,
      stackable: true,
      maxStack: 99,
    },
  });

  const creekReed = await prisma.item.upsert({
    where: { id: "creek-reed" },
    update: {},
    create: {
      id: "creek-reed",
      key: "creek-reed",
      name: "Creek Reed",
      description: "Reeds harvested from creek banks.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  // Herbalist items - Tier 2
  const duskleaf = await prisma.item.upsert({
    where: { id: "duskleaf" },
    update: {},
    create: {
      id: "duskleaf",
      key: "duskleaf",
      name: "Duskleaf",
      description: "Leaves that glow faintly in the twilight.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 15,
      stackable: true,
      maxStack: 99,
    },
  });

  const thornshadeVine = await prisma.item.upsert({
    where: { id: "thornshade-vine" },
    update: {},
    create: {
      id: "thornshade-vine",
      key: "thornshade-vine",
      name: "Thornshade Vine",
      description: "A thorny vine with dark leaves.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 18,
      stackable: true,
      maxStack: 99,
    },
  });

  const mooncap = await prisma.item.upsert({
    where: { id: "mooncap" },
    update: {},
    create: {
      id: "mooncap",
      key: "mooncap",
      name: "Mooncap",
      description: "A luminescent mushroom that glows like moonlight.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 20,
      stackable: true,
      maxStack: 99,
    },
  });

  const frostbud = await prisma.item.upsert({
    where: { id: "frostbud" },
    update: {},
    create: {
      id: "frostbud",
      key: "frostbud",
      name: "Frostbud",
      description: "A delicate bud that stays frozen even in warmth.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 22,
      stackable: true,
      maxStack: 99,
    },
  });

  const nightshade = await prisma.item.upsert({
    where: { id: "nightshade" },
    update: {},
    create: {
      id: "nightshade",
      key: "nightshade",
      name: "Nightshade",
      description: "A toxic plant that blooms only at night.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 25,
      stackable: true,
      maxStack: 99,
    },
  });

  // Herbalist items - Tier 3
  const emberbloom = await prisma.item.upsert({
    where: { id: "emberbloom" },
    update: {},
    create: {
      id: "emberbloom",
      key: "emberbloom",
      name: "Emberbloom",
      description: "A flower that radiates gentle heat like embers.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 50,
      stackable: true,
      maxStack: 99,
    },
  });

  const silverthorn = await prisma.item.upsert({
    where: { id: "silverthorn" },
    update: {},
    create: {
      id: "silverthorn",
      key: "silverthorn",
      name: "Silverthorn",
      description: "Thorns with a silver metallic sheen.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 55,
      stackable: true,
      maxStack: 99,
    },
  });

  const deepwoodMycelium = await prisma.item.upsert({
    where: { id: "deepwood-mycelium" },
    update: {},
    create: {
      id: "deepwood-mycelium",
      key: "deepwood-mycelium",
      name: "Deepwood Mycelium",
      description: "Fungal network from the deepest woods.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 60,
      stackable: true,
      maxStack: 99,
    },
  });

  const stormpetal = await prisma.item.upsert({
    where: { id: "stormpetal" },
    update: {},
    create: {
      id: "stormpetal",
      key: "stormpetal",
      name: "Stormpetal",
      description: "Petal that crackles with electrical energy.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 65,
      stackable: true,
      maxStack: 99,
    },
  });

  const bloodmoss = await prisma.item.upsert({
    where: { id: "bloodmoss" },
    update: {},
    create: {
      id: "bloodmoss",
      key: "bloodmoss",
      name: "Bloodmoss",
      description: "Moss with a deep crimson hue that pulses with life.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 70,
      stackable: true,
      maxStack: 99,
    },
  });

  // Herbalist items - Tier 4
  const wraithorchid = await prisma.item.upsert({
    where: { id: "wraithorchid" },
    update: {},
    create: {
      id: "wraithorchid",
      key: "wraithorchid",
      name: "Wraithorchid",
      description: "An ethereal orchid that seems to phase between worlds.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 150,
      stackable: true,
      maxStack: 99,
    },
  });

  const ancientGinseng = await prisma.item.upsert({
    where: { id: "ancient-ginseng" },
    update: {},
    create: {
      id: "ancient-ginseng",
      key: "ancient-ginseng",
      name: "Ancient Ginseng",
      description: "An ancient root with centuries of accumulated energy.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 175,
      stackable: true,
      maxStack: 99,
    },
  });

  const spiritvine = await prisma.item.upsert({
    where: { id: "spiritvine" },
    update: {},
    create: {
      id: "spiritvine",
      key: "spiritvine",
      name: "Spiritvine",
      description: "A vine that resonates with spiritual energy.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 200,
      stackable: true,
      maxStack: 99,
    },
  });

  const venomflower = await prisma.item.upsert({
    where: { id: "venomflower" },
    update: {},
    create: {
      id: "venomflower",
      key: "venomflower",
      name: "Venomflower",
      description: "A beautiful but deadly flower that drips with venom.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 220,
      stackable: true,
      maxStack: 99,
    },
  });

  const tempestbloom = await prisma.item.upsert({
    where: { id: "tempestbloom" },
    update: {},
    create: {
      id: "tempestbloom",
      key: "tempestbloom",
      name: "Tempestbloom",
      description: "A flower that channels the power of storms.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 240,
      stackable: true,
      maxStack: 99,
    },
  });

  // Herbalist items - Tier 5
  const starlotus = await prisma.item.upsert({
    where: { id: "starlotus" },
    update: {},
    create: {
      id: "starlotus",
      key: "starlotus",
      name: "Starlotus",
      description: "A lotus that glimmers with starlight.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 500,
      stackable: true,
      maxStack: 99,
    },
  });

  const umbralTruffle = await prisma.item.upsert({
    where: { id: "umbral-truffle" },
    update: {},
    create: {
      id: "umbral-truffle",
      key: "umbral-truffle",
      name: "Umbral Truffle",
      description: "A truffle that exists in the shadow between realms.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 600,
      stackable: true,
      maxStack: 99,
    },
  });

  const celestialSaffron = await prisma.item.upsert({
    where: { id: "celestial-saffron" },
    update: {},
    create: {
      id: "celestial-saffron",
      key: "celestial-saffron",
      name: "Celestial Saffron",
      description: "Saffron threads that shimmer with celestial energy.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 700,
      stackable: true,
      maxStack: 99,
    },
  });

  const phoenixfern = await prisma.item.upsert({
    where: { id: "phoenixfern" },
    update: {},
    create: {
      id: "phoenixfern",
      key: "phoenixfern",
      name: "Phoenixfern",
      description: "A fern that regenerates like a phoenix from its own ashes.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 800,
      stackable: true,
      maxStack: 99,
    },
  });

  const worldroot = await prisma.item.upsert({
    where: { id: "worldroot" },
    update: {},
    create: {
      id: "worldroot",
      key: "worldroot",
      name: "Worldroot",
      description: "The legendary root that connects all worlds.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 1000,
      stackable: true,
      maxStack: 99,
    },
  });

  const fish = await prisma.item.upsert({
    where: { id: "fish" },
    update: {},
    create: {
      id: "fish",
      name: "Fish",
      description: "A fresh catch.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  const wood = await prisma.item.upsert({
    where: { id: "wood" },
    update: {},
    create: {
      id: "wood",
      name: "Wood",
      description: "A piece of lumber.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 2,
      stackable: true,
      maxStack: 99,
    },
  });

  // Logger wood items - Tier 1
  const saplingWood = await prisma.item.upsert({
    where: { id: "sapling-wood" },
    update: {},
    create: {
      id: "sapling-wood",
      key: "sapling-wood",
      name: "Sapling Wood",
      description: "Young wood from saplings.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 3,
      stackable: true,
      maxStack: 99,
    },
  });

  const pineLogs = await prisma.item.upsert({
    where: { id: "pine-logs" },
    update: {},
    create: {
      id: "pine-logs",
      key: "pine-logs",
      name: "Pine Logs",
      description: "Logs from pine trees.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 4,
      stackable: true,
      maxStack: 99,
    },
  });

  const birchLogs = await prisma.item.upsert({
    where: { id: "birch-logs" },
    update: {},
    create: {
      id: "birch-logs",
      key: "birch-logs",
      name: "Birch Logs",
      description: "Logs from birch trees.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 5,
      stackable: true,
      maxStack: 99,
    },
  });

  const cedarLogs = await prisma.item.upsert({
    where: { id: "cedar-logs" },
    update: {},
    create: {
      id: "cedar-logs",
      key: "cedar-logs",
      name: "Cedar Logs",
      description: "Logs from cedar trees.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  const oakLogs = await prisma.item.upsert({
    where: { id: "oak-logs" },
    update: {},
    create: {
      id: "oak-logs",
      key: "oak-logs",
      name: "Oak Logs",
      description: "Logs from oak trees.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 7,
      stackable: true,
      maxStack: 99,
    },
  });

  // Logger wood items - Tier 2
  const mapleLogs = await prisma.item.upsert({
    where: { id: "maple-logs" },
    update: {},
    create: {
      id: "maple-logs",
      key: "maple-logs",
      name: "Maple Logs",
      description: "Logs from maple trees.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 12,
      stackable: true,
      maxStack: 99,
    },
  });

  const ashLogs = await prisma.item.upsert({
    where: { id: "ash-logs" },
    update: {},
    create: {
      id: "ash-logs",
      key: "ash-logs",
      name: "Ash Logs",
      description: "Logs from ash trees.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 15,
      stackable: true,
      maxStack: 99,
    },
  });

  const ironbarkLogs = await prisma.item.upsert({
    where: { id: "ironbark-logs" },
    update: {},
    create: {
      id: "ironbark-logs",
      key: "ironbark-logs",
      name: "Ironbark Logs",
      description: "Hard logs from ironbark trees.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 18,
      stackable: true,
      maxStack: 99,
    },
  });

  const redwoodLogs = await prisma.item.upsert({
    where: { id: "redwood-logs" },
    update: {},
    create: {
      id: "redwood-logs",
      key: "redwood-logs",
      name: "Redwood Logs",
      description: "Logs from redwood trees.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 20,
      stackable: true,
      maxStack: 99,
    },
  });

  const spruceLogs = await prisma.item.upsert({
    where: { id: "spruce-logs" },
    update: {},
    create: {
      id: "spruce-logs",
      key: "spruce-logs",
      name: "Spruce Logs",
      description: "Logs from spruce trees.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 22,
      stackable: true,
      maxStack: 99,
    },
  });

  // Logger wood items - Tier 3
  const heartwood = await prisma.item.upsert({
    where: { id: "heartwood" },
    update: {},
    create: {
      id: "heartwood",
      key: "heartwood",
      name: "Heartwood",
      description: "Dense heartwood from ancient oaks.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 35,
      stackable: true,
      maxStack: 99,
    },
  });

  const blackwoodLogs = await prisma.item.upsert({
    where: { id: "blackwood-logs" },
    update: {},
    create: {
      id: "blackwood-logs",
      key: "blackwood-logs",
      name: "Blackwood Logs",
      description: "Dark logs from blackwood trees.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 40,
      stackable: true,
      maxStack: 99,
    },
  });

  const deepforestTimber = await prisma.item.upsert({
    where: { id: "deepforest-timber" },
    update: {},
    create: {
      id: "deepforest-timber",
      key: "deepforest-timber",
      name: "Deepforest Timber",
      description: "Timber from the deepest forests.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 45,
      stackable: true,
      maxStack: 99,
    },
  });

  const stormCedar = await prisma.item.upsert({
    where: { id: "storm-cedar" },
    update: {},
    create: {
      id: "storm-cedar",
      key: "storm-cedar",
      name: "Storm Cedar",
      description: "Cedar weathered by storms.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 48,
      stackable: true,
      maxStack: 99,
    },
  });

  const firResinwood = await prisma.item.upsert({
    where: { id: "fir-resinwood" },
    update: {},
    create: {
      id: "fir-resinwood",
      key: "fir-resinwood",
      name: "Fir Resinwood",
      description: "Resinous wood from giant firs.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 50,
      stackable: true,
      maxStack: 99,
    },
  });

  // Logger wood items - Tier 4
  const ironwoodTimber = await prisma.item.upsert({
    where: { id: "ironwood-timber" },
    update: {},
    create: {
      id: "ironwood-timber",
      key: "ironwood-timber",
      name: "Ironwood Timber",
      description: "Extremely hard timber from ironwood trees.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 75,
      stackable: true,
      maxStack: 99,
    },
  });

  const elderRedwoodTimber = await prisma.item.upsert({
    where: { id: "elder-redwood-timber" },
    update: {},
    create: {
      id: "elder-redwood-timber",
      key: "elder-redwood-timber",
      name: "Elder Redwood Timber",
      description: "Timber from ancient redwood trees.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 85,
      stackable: true,
      maxStack: 99,
    },
  });

  const ghostbark = await prisma.item.upsert({
    where: { id: "ghostbark" },
    update: {},
    create: {
      id: "ghostbark",
      key: "ghostbark",
      name: "Ghostbark",
      description: "Ethereal bark from ghostly trees.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 95,
      stackable: true,
      maxStack: 99,
    },
  });

  const thornwood = await prisma.item.upsert({
    where: { id: "thornwood" },
    update: {},
    create: {
      id: "thornwood",
      key: "thornwood",
      name: "Thornwood",
      description: "Wood from thorny brambletrees.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 105,
      stackable: true,
      maxStack: 99,
    },
  });

  const tempestPine = await prisma.item.upsert({
    where: { id: "tempest-pine" },
    update: {},
    create: {
      id: "tempest-pine",
      key: "tempest-pine",
      name: "Tempest Pine",
      description: "Pine wood from tempest-swept highlands.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 115,
      stackable: true,
      maxStack: 99,
    },
  });

  // Logger wood items - Tier 5
  const moonSequoiaTimber = await prisma.item.upsert({
    where: { id: "moon-sequoia-timber" },
    update: {},
    create: {
      id: "moon-sequoia-timber",
      key: "moon-sequoia-timber",
      name: "Moon Sequoia Timber",
      description: "Timber from moon-touched sequoias.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 180,
      stackable: true,
      maxStack: 99,
    },
  });

  const mangroveCorewood = await prisma.item.upsert({
    where: { id: "mangrove-corewood" },
    update: {},
    create: {
      id: "mangrove-corewood",
      key: "mangrove-corewood",
      name: "Mangrove Corewood",
      description: "Corewood from sunken mangrove titans.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 210,
      stackable: true,
      maxStack: 99,
    },
  });

  const crystalYewWood = await prisma.item.upsert({
    where: { id: "crystal-yew-wood" },
    update: {},
    create: {
      id: "crystal-yew-wood",
      key: "crystal-yew-wood",
      name: "Crystal Yew Wood",
      description: "Crystalline wood from crystalheart yews.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 240,
      stackable: true,
      maxStack: 99,
    },
  });

  const worldAshTimber = await prisma.item.upsert({
    where: { id: "world-ash-timber" },
    update: {},
    create: {
      id: "world-ash-timber",
      key: "world-ash-timber",
      name: "World-Ash Timber",
      description: "Timber from the World-Ash Branchspire.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 270,
      stackable: true,
      maxStack: 99,
    },
  });

  const mythicRootwood = await prisma.item.upsert({
    where: { id: "mythic-rootwood" },
    update: {},
    create: {
      id: "mythic-rootwood",
      key: "mythic-rootwood",
      name: "Mythic Rootwood",
      description: "Legendary wood from the Mythic Rootwood Monolith.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 300,
      stackable: true,
      maxStack: 99,
    },
  });

  // Crafted items
  const ironBar = await prisma.item.upsert({
    where: { id: "iron-bar" },
    update: {},
    create: {
      id: "iron-bar",
      name: "Iron Bar",
      description: "A refined iron bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 25,
      stackable: true,
      maxStack: 99,
    },
  });

  const healthPotion = await prisma.item.upsert({
    where: { id: "health-potion" },
    update: {},
    create: {
      id: "health-potion",
      key: "health-potion",
      name: "Health Potion",
      description: "Restores health when consumed.",
      itemType: "CONSUMABLE",
      itemRarity: "COMMON",
      tier: 1,
      value: 20,
      stackable: true,
      maxStack: 99,
    },
  });

  const cookedFish = await prisma.item.upsert({
    where: { id: "cooked-fish" },
    update: {},
    create: {
      id: "cooked-fish",
      name: "Cooked Fish",
      description: "A delicious cooked fish that restores stamina.",
      itemType: "CONSUMABLE",
      itemRarity: "COMMON",
      tier: 1,
      value: 15,
      stackable: true,
      maxStack: 99,
    },
  });

  const clothShirt = await prisma.item.upsert({
    where: { id: "cloth-shirt" },
    update: {},
    create: {
      id: "cloth-shirt",
      name: "Cloth Shirt",
      description: "A basic cloth shirt.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 30,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "BODY",
      vitalityBonus: 1,
    },
  });

  // Equipment items
  console.log("Creating equipment items...");

  const ironHelmet = await prisma.item.upsert({
    where: { id: "iron-helmet" },
    update: {},
    create: {
      id: "iron-helmet",
      key: "iron-helmet",
      name: "Iron Helmet",
      description: "A sturdy iron helmet that protects the head.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 50,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "HEAD",
      vitalityBonus: 2,
      strengthBonus: 1,
    },
  });

  const ironSword = await prisma.item.upsert({
    where: { id: "iron-sword" },
    update: {},
    create: {
      id: "iron-sword",
      key: "iron-sword",
      name: "Iron Sword",
      description: "A basic iron sword for combat.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 60,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "ARMS",
      strengthBonus: 3,
      dexterityBonus: 1,
    },
  });

  const ironShield = await prisma.item.upsert({
    where: { id: "iron-shield" },
    update: {},
    create: {
      id: "iron-shield",
      key: "iron-shield",
      name: "Iron Shield",
      description: "A defensive iron shield.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 55,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "ARMS",
      vitalityBonus: 2,
      hpBonus: 10,
    },
  });

  const leatherArmor = await prisma.item.upsert({
    where: { id: "leather-armor" },
    update: {},
    create: {
      id: "leather-armor",
      key: "leather-armor",
      name: "Leather Armor",
      description: "Lightweight leather body armor.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 70,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "BODY",
      vitalityBonus: 3,
      speedBonus: 1,
    },
  });

  const leatherBoots = await prisma.item.upsert({
    where: { id: "leather-boots" },
    update: {},
    create: {
      id: "leather-boots",
      key: "leather-boots",
      name: "Leather Boots",
      description: "Comfortable leather boots.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 40,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "FEET",
      speedBonus: 2,
    },
  });

  const copperRing = await prisma.item.upsert({
    where: { id: "copper-ring" },
    update: {},
    create: {
      id: "copper-ring",
      key: "copper-ring",
      name: "Copper Ring",
      description: "A simple copper ring with minor magical properties.",
      itemType: "EQUIPMENT",
      itemRarity: "COMMON",
      tier: 1,
      value: 30,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "RING",
      vitalityBonus: 1,
      spBonus: 5,
    },
  });

  const amuletOfHealth = await prisma.item.upsert({
    where: { id: "amulet-of-health" },
    update: {},
    create: {
      id: "amulet-of-health",
      key: "amulet-of-health",
      name: "Amulet of Health",
      description: "A magical amulet that increases vitality.",
      itemType: "EQUIPMENT",
      itemRarity: "UNCOMMON",
      tier: 1,
      value: 80,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "NECKLACE",
      vitalityBonus: 4,
      hpBonus: 20,
    },
  });

  // Skills
  console.log("Creating skills...");

  const basicAttack = await prisma.skill.upsert({
    where: { id: "basic-attack" },
    update: {},
    create: {
      id: "basic-attack",
      key: "basic-attack",
      slug: "basic-attack",
      name: "Basic Attack",
      description: "A simple melee attack.",
      staminaCost: 5,
      cooldownTurns: 0,
    },
  });

  const powerStrike = await prisma.skill.upsert({
    where: { id: "power-strike" },
    update: {},
    create: {
      id: "power-strike",
      key: "power-strike",
      slug: "power-strike",
      name: "Power Strike",
      description: "A powerful attack that deals extra damage.",
      staminaCost: 15,
      cooldownTurns: 3,
    },
  });

  const heal = await prisma.skill.upsert({
    where: { id: "heal" },
    update: {},
    create: {
      id: "heal",
      key: "heal",
      slug: "heal",
      name: "Heal",
      description: "Restores a small amount of health.",
      staminaCost: 10,
      cooldownTurns: 5,
    },
  });

  const dodge = await prisma.skill.upsert({
    where: { id: "dodge" },
    update: {},
    create: {
      id: "dodge",
      key: "dodge",
      slug: "dodge",
      name: "Dodge",
      description: "Increases evasion for a short time.",
      staminaCost: 8,
      cooldownTurns: 10,
    },
  });

  const shieldBash = await prisma.skill.upsert({
    where: { id: "shield-bash" },
    update: {},
    create: {
      id: "shield-bash",
      key: "shield-bash",
      slug: "shield-bash",
      name: "Shield Bash",
      description: "Bash with your shield, stunning the enemy.",
      staminaCost: 12,
      cooldownTurns: 8,
    },
  });

  console.log("✅ Seed completed!");

  // Get job IDs
  const blacksmithJob = await prisma.job.findUnique({ where: { key: "blacksmith" } });
  const tailorJob = await prisma.job.findUnique({ where: { key: "tailor" } });
  const alchemistJob = await prisma.job.findUnique({ where: { key: "alchemist" } });
  const cookJob = await prisma.job.findUnique({ where: { key: "cook" } });
  const minerJob = await prisma.job.findUnique({ where: { key: "miner" } });
  const fisherJob = await prisma.job.findUnique({ where: { key: "fisher" } });
  const herbalistJob = await prisma.job.findUnique({ where: { key: "herbalist" } });
  const loggerJob = await prisma.job.findUnique({ where: { key: "logger" } });

  if (!blacksmithJob || !tailorJob || !alchemistJob || !cookJob || !minerJob || !fisherJob || !herbalistJob || !loggerJob) {
    throw new Error("Jobs not found");
  }

  // Create recipes
  console.log("Creating recipes...");

  // Create bar items if they don't exist
  const copperBar = await prisma.item.upsert({
    where: { id: "copper-bar" },
    update: {},
    create: {
      id: "copper-bar",
      key: "copper-bar",
      name: "Copper Bar",
      description: "A refined copper bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 15,
      stackable: true,
      maxStack: 99,
    },
  });

  const bronzeBar = await prisma.item.upsert({
    where: { id: "bronze-bar" },
    update: {},
    create: {
      id: "bronze-bar",
      key: "bronze-bar",
      name: "Bronze Bar",
      description: "A refined bronze bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 20,
      stackable: true,
      maxStack: 99,
    },
  });

  const steelLongsword = await prisma.item.upsert({
    where: { id: "steel-longsword" },
    update: {},
    create: {
      id: "steel-longsword",
      key: "steel-longsword",
      name: "Steel Longsword",
      description: "A well-crafted steel longsword.",
      itemType: "WEAPON",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 150,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "MAINHAND",
      strengthBonus: 5,
      defenseBonus: 2,
    },
  });

  // Blacksmith: Copper Ore -> Copper Bar (SMELTER)
  const copperBarRecipe = await prisma.recipe.upsert({
    where: { id: "copper-bar-recipe" },
    update: {
      station: "SMELTER",
      craftTimeSeconds: 30,
      xp: 15,
      isActive: true,
      requiredJobLevel: 1,
    },
    create: {
      id: "copper-bar-recipe",
      jobId: blacksmithJob.id,
      name: "Copper Bar",
      description: "Smelt copper ore into a refined copper bar.",
      difficulty: 1,
      requiredJobLevel: 1,
      station: "SMELTER",
      craftTimeSeconds: 30,
      xp: 15,
      isActive: true,
      allowNonGatherableInputs: false,
      status: "ACTIVE",
      outputItemId: copperBar.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${copperBarRecipe.id}-copper-ore` },
    update: {},
    create: {
      id: `${copperBarRecipe.id}-copper-ore`,
      recipeId: copperBarRecipe.id,
      itemId: copperOre.id,
      qty: 2,
    },
  });

  // Blacksmith: Copper + Tin -> Bronze Bar (SMELTER)
  const bronzeBarRecipe = await prisma.recipe.upsert({
    where: { id: "bronze-bar-recipe" },
    update: {
      station: "SMELTER",
      craftTimeSeconds: 45,
      xp: 25,
      isActive: true,
      requiredJobLevel: 5,
    },
    create: {
      id: "bronze-bar-recipe",
      jobId: blacksmithJob.id,
      name: "Bronze Bar",
      description: "Smelt copper and tin ore into a bronze bar.",
      difficulty: 2,
      requiredJobLevel: 5,
      station: "SMELTER",
      craftTimeSeconds: 45,
      xp: 25,
      isActive: true,
      allowNonGatherableInputs: false,
      status: "ACTIVE",
      outputItemId: bronzeBar.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${bronzeBarRecipe.id}-copper-ore` },
    update: {},
    create: {
      id: `${bronzeBarRecipe.id}-copper-ore`,
      recipeId: bronzeBarRecipe.id,
      itemId: copperOre.id,
      qty: 2,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${bronzeBarRecipe.id}-tin-ore` },
    update: {},
    create: {
      id: `${bronzeBarRecipe.id}-tin-ore`,
      recipeId: bronzeBarRecipe.id,
      itemId: tinOre.id,
      qty: 1,
    },
  });

  // Blacksmith: Iron Ore -> Iron Bar (SMELTER) - Updated with new fields
  const ironBarRecipe = await prisma.recipe.upsert({
    where: { id: "iron-bar-recipe" },
    update: {
      station: "SMELTER",
      craftTimeSeconds: 60,
      xp: 30,
      isActive: true,
      requiredJobLevel: 10,
    },
    create: {
      id: "iron-bar-recipe",
      jobId: blacksmithJob.id,
      name: "Iron Bar",
      description: "Smelt iron ore into a refined iron bar.",
      difficulty: 2,
      requiredJobLevel: 10,
      station: "SMELTER",
      craftTimeSeconds: 60,
      xp: 30,
      isActive: true,
      allowNonGatherableInputs: false,
      status: "ACTIVE",
      outputItemId: ironBar.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${ironBarRecipe.id}-iron-ore` },
    update: {},
    create: {
      id: `${ironBarRecipe.id}-iron-ore`,
      recipeId: ironBarRecipe.id,
      itemId: ironOre.id,
      qty: 2,
    },
  });

  // Blacksmith: Iron Bar + Coal -> Steel Longsword (ANVIL)
  const steelLongswordRecipe = await prisma.recipe.upsert({
    where: { id: "steel-longsword-recipe" },
    update: {
      station: "ANVIL",
      craftTimeSeconds: 120,
      xp: 50,
      isActive: true,
      requiredJobLevel: 15,
    },
    create: {
      id: "steel-longsword-recipe",
      jobId: blacksmithJob.id,
      name: "Steel Longsword",
      description: "Forge a steel longsword from iron bars and coal.",
      difficulty: 4,
      requiredJobLevel: 15,
      station: "ANVIL",
      craftTimeSeconds: 120,
      xp: 50,
      isActive: true,
      allowNonGatherableInputs: true, // Allows iron bar (from recipe) and coal
      status: "ACTIVE",
      outputItemId: steelLongsword.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${steelLongswordRecipe.id}-iron-bar` },
    update: {},
    create: {
      id: `${steelLongswordRecipe.id}-iron-bar`,
      recipeId: steelLongswordRecipe.id,
      itemId: ironBar.id,
      qty: 3,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${steelLongswordRecipe.id}-coal` },
    update: {},
    create: {
      id: `${steelLongswordRecipe.id}-coal`,
      recipeId: steelLongswordRecipe.id,
      itemId: coal.id,
      qty: 2,
    },
  });

  // ==========================================
  // FULL BLACKSMITH RECIPE PACK (Levels 1-100)
  // ==========================================
  console.log("Creating full Blacksmith recipe pack...");

  // Create all missing bar items first
  const tinBar = await prisma.item.upsert({
    where: { id: "tin-bar" },
    update: {},
    create: {
      id: "tin-bar",
      key: "tin-bar",
      name: "Tin Bar",
      description: "A refined tin bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 12,
      stackable: true,
      maxStack: 99,
    },
  });

  const steelBar = await prisma.item.upsert({
    where: { id: "steel-bar" },
    update: {},
    create: {
      id: "steel-bar",
      key: "steel-bar",
      name: "Steel Bar",
      description: "A refined steel bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 45,
      stackable: true,
      maxStack: 99,
    },
  });

  const silverBar = await prisma.item.upsert({
    where: { id: "silver-bar" },
    update: {},
    create: {
      id: "silver-bar",
      key: "silver-bar",
      name: "Silver Bar",
      description: "A refined silver bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 70,
      stackable: true,
      maxStack: 99,
    },
  });

  const goldBar = await prisma.item.upsert({
    where: { id: "gold-bar" },
    update: {},
    create: {
      id: "gold-bar",
      key: "gold-bar",
      name: "Gold Bar",
      description: "A refined gold bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 95,
      stackable: true,
      maxStack: 99,
    },
  });

  const mithrilBar = await prisma.item.upsert({
    where: { id: "mithril-bar" },
    update: {},
    create: {
      id: "mithril-bar",
      key: "mithril-bar",
      name: "Mithril Bar",
      description: "A refined mithril bar ready for forging.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 380,
      stackable: true,
      maxStack: 99,
    },
  });

  // Create component items
  const rivets = await prisma.item.upsert({
    where: { id: "rivets" },
    update: {},
    create: {
      id: "rivets",
      key: "rivets",
      name: "Iron Rivets",
      description: "Small iron rivets used for armor construction.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 2,
      value: 5,
      stackable: true,
      maxStack: 99,
    },
  });

  const plate = await prisma.item.upsert({
    where: { id: "plate" },
    update: {},
    create: {
      id: "plate",
      key: "plate",
      name: "Steel Plate",
      description: "A reinforced steel plate for armor crafting.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 25,
      stackable: true,
      maxStack: 99,
    },
  });

  const reinforcedPlate = await prisma.item.upsert({
    where: { id: "reinforced-plate" },
    update: {},
    create: {
      id: "reinforced-plate",
      key: "reinforced-plate",
      name: "Reinforced Plate",
      description: "A heavily reinforced plate for advanced armor.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 4,
      value: 120,
      stackable: true,
      maxStack: 99,
    },
  });

  const gemSettingRuby = await prisma.item.upsert({
    where: { id: "gem-setting-ruby" },
    update: {},
    create: {
      id: "gem-setting-ruby",
      key: "gem-setting-ruby",
      name: "Ruby Gem Setting",
      description: "A silver setting designed to hold quartz crystals.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 55,
      stackable: true,
      maxStack: 99,
    },
  });

  const gemSettingSapphire = await prisma.item.upsert({
    where: { id: "gem-setting-sapphire" },
    update: {},
    create: {
      id: "gem-setting-sapphire",
      key: "gem-setting-sapphire",
      name: "Sapphire Gem Setting",
      description: "A silver setting designed to hold geode crystals.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 65,
      stackable: true,
      maxStack: 99,
    },
  });

  const gemSettingEmerald = await prisma.item.upsert({
    where: { id: "gem-setting-emerald" },
    update: {},
    create: {
      id: "gem-setting-emerald",
      key: "gem-setting-emerald",
      name: "Emerald Gem Setting",
      description: "A silver setting designed to hold tempest crystals.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 140,
      stackable: true,
      maxStack: 99,
    },
  });

  const gildedHilt = await prisma.item.upsert({
    where: { id: "gilded-hilt" },
    update: {},
    create: {
      id: "gilded-hilt",
      key: "gilded-hilt",
      name: "Gilded Hilt",
      description: "An ornate hilt crafted with gold accents.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 40,
      stackable: true,
      maxStack: 99,
    },
  });

  const mithrilEdge = await prisma.item.upsert({
    where: { id: "mithril-edge" },
    update: {},
    create: {
      id: "mithril-edge",
      key: "mithril-edge",
      name: "Mithril Edge",
      description: "A razor-sharp blade edge forged from mithril.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 200,
      stackable: true,
      maxStack: 99,
    },
  });

  const legendaryCore = await prisma.item.upsert({
    where: { id: "legendary-core" },
    update: {},
    create: {
      id: "legendary-core",
      key: "legendary-core",
      name: "Legendary Core",
      description: "A powerful core forged from celestial materials.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 800,
      stackable: true,
      maxStack: 99,
    },
  });

  const runedPlate = await prisma.item.upsert({
    where: { id: "runed-plate" },
    update: {},
    create: {
      id: "runed-plate",
      key: "runed-plate",
      name: "Runed Plate",
      description: "A plate inscribed with ancient runes.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 1000,
      stackable: true,
      maxStack: 99,
    },
  });

  // Helper function to create recipes idempotently
  const createRecipe = async (
    recipeId: string,
    name: string,
    description: string,
    jobId: string,
    difficulty: number,
    requiredJobLevel: number,
    station: "SMELTER" | "ANVIL",
    craftTimeSeconds: number,
    xp: number,
    outputItemId: string,
    outputQty: number,
    inputs: Array<{ itemId: string; qty: number }>,
    allowNonGatherableInputs: boolean = false
  ) => {
    const recipe = await prisma.recipe.upsert({
      where: { id: recipeId },
      update: {
        station,
        craftTimeSeconds,
        xp,
        requiredJobLevel,
        isActive: true,
      },
      create: {
        id: recipeId,
        jobId,
        name,
        description,
        difficulty,
        requiredJobLevel,
        station,
        craftTimeSeconds,
        xp,
        isActive: true,
        allowNonGatherableInputs,
        status: "ACTIVE",
        outputItemId,
        outputQty,
      },
    });

    for (const input of inputs) {
      await prisma.recipeInput.upsert({
        where: { id: `${recipeId}-${input.itemId}` },
        update: { qty: input.qty },
        create: {
          id: `${recipeId}-${input.itemId}`,
          recipeId: recipe.id,
          itemId: input.itemId,
          qty: input.qty,
        },
      });
    }
  };

  // Helper function to create gear items
  const createGearItem = async (
    itemId: string,
    key: string,
    name: string,
    description: string,
    itemType: "WEAPON" | "ARMOR" | "TOOL",
    itemRarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY",
    tier: number,
    value: number,
    equipmentSlot: "MAINHAND" | "OFFHAND" | "HEAD" | "ARMS" | "BODY" | "LEGS" | "FEET" | "RING" | "NECKLACE" | "BELT" | "CLOAK",
    stats?: {
      strengthBonus?: number;
      vitalityBonus?: number;
      speedBonus?: number;
      dexterityBonus?: number;
      hpBonus?: number;
      spBonus?: number;
      defenseBonus?: number;
    }
  ) => {
    return await prisma.item.upsert({
      where: { id: itemId },
      update: {},
      create: {
        id: itemId,
        key,
        name,
        description,
        itemType,
        itemRarity,
        tier,
        value,
        stackable: false,
        maxStack: 1,
        equipmentSlot,
        ...(stats || {}),
      },
    });
  };

  // Create all gear items (weapons, armor, tools)
  // Tier 1 Weapons (Levels 1-20)
  const bronzeDagger = await createGearItem(
    "bronze-dagger",
    "bronze-dagger",
    "Bronze Dagger",
    "A lightweight bronze dagger.",
    "WEAPON",
    "COMMON",
    1,
    30,
    "MAINHAND",
    { strengthBonus: 2 }
  );

  const bronzeShortsword = await createGearItem(
    "bronze-shortsword",
    "bronze-shortsword",
    "Bronze Shortsword",
    "A simple bronze shortsword.",
    "WEAPON",
    "COMMON",
    1,
    45,
    "MAINHAND",
    { strengthBonus: 3 }
  );

  const ironDagger = await createGearItem(
    "iron-dagger",
    "iron-dagger",
    "Iron Dagger",
    "A sturdy iron dagger.",
    "WEAPON",
    "COMMON",
    1,
    50,
    "MAINHAND",
    { strengthBonus: 3, dexterityBonus: 1 }
  );

  const ironShortsword = await createGearItem(
    "iron-shortsword",
    "iron-shortsword",
    "Iron Shortsword",
    "A well-balanced iron shortsword.",
    "WEAPON",
    "UNCOMMON",
    2,
    80,
    "MAINHAND",
    { strengthBonus: 4, dexterityBonus: 1 }
  );

  const bronzeMace = await createGearItem(
    "bronze-mace",
    "bronze-mace",
    "Bronze Mace",
    "A heavy bronze mace.",
    "WEAPON",
    "COMMON",
    1,
    55,
    "MAINHAND",
    { strengthBonus: 4 }
  );

  const ironMace = await createGearItem(
    "iron-mace",
    "iron-mace",
    "Iron Mace",
    "A heavy iron mace for crushing.",
    "WEAPON",
    "UNCOMMON",
    2,
    90, "MAINHAND", { strengthBonus: 5 }
  );

  // Tier 2 Weapons (Levels 21-40)
  const steelDagger = await createGearItem(
    "steel-dagger",
    "steel-dagger",
    "Steel Dagger",
    "A sharp steel dagger.",
    "WEAPON",
    "UNCOMMON",
    2,
    110, "MAINHAND", { strengthBonus: 4, dexterityBonus: 2 }
  );

  const steelShortsword = await createGearItem(
    "steel-shortsword",
    "steel-shortsword",
    "Steel Shortsword",
    "A refined steel shortsword.",
    "WEAPON",
    "UNCOMMON",
    2,
    140, "MAINHAND", { strengthBonus: 6, dexterityBonus: 1 }
  );

  const steelMace = await createGearItem(
    "steel-mace",
    "steel-mace",
    "Steel Mace",
    "A powerful steel mace.",
    "WEAPON",
    "UNCOMMON",
    2,
    150, "MAINHAND", { strengthBonus: 7 }
  );

  const ironWarhammer = await createGearItem(
    "iron-warhammer",
    "iron-warhammer",
    "Iron Warhammer",
    "A massive iron warhammer.",
    "WEAPON",
    "UNCOMMON",
    2,
    160, "MAINHAND", { strengthBonus: 8 }
  );

  const steelWarhammer = await createGearItem(
    "steel-warhammer",
    "steel-warhammer",
    "Steel Warhammer",
    "A devastating steel warhammer.",
    "WEAPON",
    "RARE",
    2,
    200, "MAINHAND", { strengthBonus: 10 }
  );

  const steelGreatsword = await createGearItem(
    "steel-greatsword",
    "steel-greatsword",
    "Steel Greatsword",
    "A massive steel greatsword.",
    "WEAPON",
    "RARE",
    2,
    220, "MAINHAND", { strengthBonus: 11 }
  );

  const ironSpear = await createGearItem(
    "iron-spear",
    "iron-spear",
    "Iron Spear",
    "A long iron spear.",
    "WEAPON",
    "UNCOMMON",
    2,
    130, "MAINHAND", { strengthBonus: 5, speedBonus: 1 }
  );

  const steelSpear = await createGearItem(
    "steel-spear",
    "steel-spear",
    "Steel Spear",
    "A precise steel spear.",
    "WEAPON",
    "UNCOMMON",
    2,
    170, "MAINHAND", { strengthBonus: 7, speedBonus: 2 }
  );

  // Tier 3 Weapons (Levels 41-60)
  const gildedBlade = await createGearItem(
    "gilded-blade",
    "gilded-blade",
    "Gilded Blade",
    "An elegant blade with gold accents.",
    "WEAPON",
    "RARE",
    3,
    280, "MAINHAND", { strengthBonus: 9, dexterityBonus: 2 }
  );

  const silverShortsword = await createGearItem(
    "silver-shortsword",
    "silver-shortsword",
    "Silver Shortsword",
    "A finely crafted silver shortsword.",
    "WEAPON",
    "RARE",
    3,
    300, "MAINHAND", { strengthBonus: 10, dexterityBonus: 3 }
  );

  const socketedSwordRuby = await createGearItem(
    "socketed-sword-ruby",
    "socketed-sword-ruby",
    "Socketed Sword (Ruby)",
    "A sword with a quartz crystal socket.",
    "WEAPON",
    "RARE",
    3,
    320, "MAINHAND", { strengthBonus: 11, vitalityBonus: 2 }
  );

  const socketedSwordSapphire = await createGearItem(
    "socketed-sword-sapphire",
    "socketed-sword-sapphire",
    "Socketed Sword (Sapphire)",
    "A sword with a geode crystal socket.",
    "WEAPON",
    "RARE",
    3,
    350, "MAINHAND", { strengthBonus: 12, dexterityBonus: 2 }
  );

  // Tier 4 Weapons (Levels 61-80)
  const mithrilDagger = await createGearItem(
    "mithril-dagger",
    "mithril-dagger",
    "Mithril Dagger",
    "A razor-sharp mithril dagger.",
    "WEAPON",
    "EPIC",
    4,
    450, "MAINHAND", { strengthBonus: 13, dexterityBonus: 5, speedBonus: 2 }
  );

  const mithrilLongsword = await createGearItem(
    "mithril-longsword",
    "mithril-longsword",
    "Mithril Longsword",
    "An exquisite mithril longsword.",
    "WEAPON",
    "EPIC",
    4,
    520, "MAINHAND", { strengthBonus: 16, dexterityBonus: 3, speedBonus: 2 }
  );

  const mithrilGreatsword = await createGearItem(
    "mithril-greatsword",
    "mithril-greatsword",
    "Mithril Greatsword",
    "A legendary mithril greatsword.",
    "WEAPON",
    "EPIC",
    4,
    580, "MAINHAND", { strengthBonus: 18, vitalityBonus: 3 }
  );

  // Tier 5 Weapons (Levels 81-100)
  const runedGreatsword = await createGearItem(
    "runed-greatsword",
    "runed-greatsword",
    "Runed Greatsword",
    "A greatsword inscribed with ancient runes.",
    "WEAPON",
    "LEGENDARY",
    5,
    1200, "MAINHAND", { strengthBonus: 25, vitalityBonus: 5, dexterityBonus: 3 }
  );

  // Additional Weapons for expanded recipe set
  const bronzeLongsword = await createGearItem(
    "bronze-longsword",
    "bronze-longsword",
    "Bronze Longsword",
    "A basic bronze longsword.",
    "WEAPON",
    "COMMON",
    1,
    50,
    "MAINHAND",
    { strengthBonus: 3 }
  );

  const ironLongsword = await createGearItem(
    "iron-longsword",
    "iron-longsword",
    "Iron Longsword",
    "A reliable iron longsword.",
    "WEAPON",
    "UNCOMMON",
    2,
    100,
    "MAINHAND",
    { strengthBonus: 5 }
  );

  const silverDagger = await createGearItem(
    "silver-dagger",
    "silver-dagger",
    "Silver Dagger",
    "An elegant silver dagger.",
    "WEAPON",
    "RARE",
    3,
    180,
    "MAINHAND",
    { strengthBonus: 7, dexterityBonus: 2 }
  );

  const gildedMace = await createGearItem(
    "gilded-mace",
    "gilded-mace",
    "Gilded Mace",
    "An ornate mace with gold accents.",
    "WEAPON",
    "RARE",
    3,
    220,
    "MAINHAND",
    { strengthBonus: 8, defenseBonus: 2 }
  );

  const silverSpear = await createGearItem(
    "silver-spear",
    "silver-spear",
    "Silver Spear",
    "An elegant silver spear.",
    "WEAPON",
    "RARE",
    3,
    200,
    "MAINHAND",
    { strengthBonus: 6, speedBonus: 3 }
  );

  const socketedSwordEmerald = await createGearItem(
    "socketed-sword-emerald",
    "socketed-sword-emerald",
    "Socketed Sword (Emerald)",
    "A sword with a tempest crystal socket.",
    "WEAPON",
    "EPIC",
    3,
    280,
    "MAINHAND",
    { strengthBonus: 9, speedBonus: 2 }
  );

  const mithrilShortsword = await createGearItem(
    "mithril-shortsword",
    "mithril-shortsword",
    "Mithril Shortsword",
    "A precise mithril shortsword.",
    "WEAPON",
    "EPIC",
    4,
    350,
    "MAINHAND",
    { strengthBonus: 12, speedBonus: 4 }
  );

  const mithrilMace = await createGearItem(
    "mithril-mace",
    "mithril-mace",
    "Mithril Mace",
    "A legendary mithril mace.",
    "WEAPON",
    "EPIC",
    4,
    380,
    "MAINHAND",
    { strengthBonus: 14, defenseBonus: 3 }
  );

  const mithrilWarhammer = await createGearItem(
    "mithril-warhammer",
    "mithril-warhammer",
    "Mithril Warhammer",
    "A devastating mithril warhammer.",
    "WEAPON",
    "EPIC",
    4,
    420,
    "MAINHAND",
    { strengthBonus: 16, defenseBonus: 4 }
  );

  const mithrilSpear = await createGearItem(
    "mithril-spear",
    "mithril-spear",
    "Mithril Spear",
    "A legendary mithril spear.",
    "WEAPON",
    "EPIC",
    4,
    400,
    "MAINHAND",
    { strengthBonus: 13, speedBonus: 5 }
  );

  const legendaryBlade = await createGearItem(
    "legendary-blade",
    "legendary-blade",
    "Legendary Blade",
    "A blade forged from celestial materials.",
    "WEAPON",
    "LEGENDARY",
    5,
    800,
    "MAINHAND",
    { strengthBonus: 20, speedBonus: 6 }
  );

  const runedLongsword = await createGearItem(
    "runed-longsword",
    "runed-longsword",
    "Runed Longsword",
    "A longsword inscribed with ancient runes.",
    "WEAPON",
    "LEGENDARY",
    5,
    850,
    "MAINHAND",
    { strengthBonus: 22, defenseBonus: 5 }
  );

  const celestialGreatsword = await createGearItem(
    "celestial-greatsword",
    "celestial-greatsword",
    "Celestial Greatsword",
    "A greatsword forged from celestial mithril.",
    "WEAPON",
    "LEGENDARY",
    5,
    900,
    "MAINHAND",
    { strengthBonus: 25, defenseBonus: 6 }
  );

  // Tier 1 Armor (Levels 1-20)
  const bronzeHelm = await createGearItem(
    "bronze-helm",
    "bronze-helm",
    "Bronze Helm",
    "A basic bronze helmet.",
    "ARMOR",
    "COMMON",
    1,
    40,
    "HEAD",
    { vitalityBonus: 2, defenseBonus: 1 }
  );

  const bronzeChestplate = await createGearItem(
    "bronze-chestplate",
    "bronze-chestplate",
    "Bronze Chestplate",
    "A simple bronze chestplate.",
    "ARMOR",
    "COMMON",
    1,
    60,
    "BODY",
    { vitalityBonus: 3, defenseBonus: 2 }
  );

  const bronzeLegs = await createGearItem(
    "bronze-legs",
    "bronze-legs",
    "Bronze Legguards",
    "Basic bronze leg protection.",
    "ARMOR",
    "COMMON",
    1,
    50,
    "LEGS",
    { vitalityBonus: 2, defenseBonus: 1 }
  );

  const bronzeBoots = await createGearItem(
    "bronze-boots",
    "bronze-boots",
    "Bronze Boots",
    "Sturdy bronze boots.",
    "ARMOR",
    "COMMON",
    1,
    35,
    "FEET",
    { vitalityBonus: 1, speedBonus: 1, defenseBonus: 1 }
  );

  const bronzeGloves = await createGearItem(
    "bronze-gloves",
    "bronze-gloves",
    "Bronze Gauntlets",
    "Heavy bronze gauntlets.",
    "ARMOR",
    "COMMON",
    1,
    30,
    "ARMS",
    { strengthBonus: 1, dexterityBonus: 1 }
  );

  const bronzeShield = await createGearItem(
    "bronze-shield",
    "bronze-shield",
    "Bronze Shield",
    "A round bronze shield.",
    "ARMOR",
    "COMMON",
    1,
    55,
    "OFFHAND",
    { vitalityBonus: 2, defenseBonus: 3 }
  );

  const ironHelm = await createGearItem(
    "iron-helm",
    "iron-helm",
    "Iron Helm",
    "A sturdy iron helmet.",
    "ARMOR",
    "COMMON",
    1,
    80,
    "HEAD",
    { vitalityBonus: 3, defenseBonus: 2 }
  );

  const ironChestplate = await createGearItem(
    "iron-chestplate",
    "iron-chestplate",
    "Iron Chestplate",
    "A well-crafted iron chestplate.",
    "ARMOR",
    "UNCOMMON",
    2,
    120,
    "BODY",
    { vitalityBonus: 5, defenseBonus: 4 }
  );

  const ironLegs = await createGearItem(
    "iron-legs",
    "iron-legs",
    "Iron Legguards",
    "Protective iron leg armor.",
    "ARMOR",
    "UNCOMMON",
    2,
    100,
    "LEGS",
    { vitalityBonus: 4, defenseBonus: 3 }
  );

  const ironBoots = await createGearItem(
    "iron-boots",
    "iron-boots",
    "Iron Boots",
    "Reinforced iron boots.",
    "ARMOR",
    "UNCOMMON",
    2,
    70,
    "FEET",
    { vitalityBonus: 2, speedBonus: 1, defenseBonus: 2 }
  );


  // Tier 2 Armor (Levels 21-40)
  const steelHelm = await createGearItem(
    "steel-helm",
    "steel-helm",
    "Steel Helm",
    "A reinforced steel helmet.",
    "ARMOR",
    "UNCOMMON",
    2,
    150,
    "HEAD",
    { vitalityBonus: 4, defenseBonus: 3 }
  );

  const steelChestplate = await createGearItem(
    "steel-chestplate",
    "steel-chestplate",
    "Steel Chestplate",
    "A masterfully crafted steel chestplate.",
    "ARMOR",
    "UNCOMMON",
    2,
    220,
    "BODY",
    { vitalityBonus: 7, defenseBonus: 6 }
  );

  const steelLegs = await createGearItem(
    "steel-legs",
    "steel-legs",
    "Steel Legguards",
    "Excellent steel leg protection.",
    "ARMOR",
    "UNCOMMON",
    2,
    180,
    "LEGS",
    { vitalityBonus: 6, defenseBonus: 5 }
  );

  const steelBoots = await createGearItem(
    "steel-boots",
    "steel-boots",
    "Steel Boots",
    "Durable steel boots.",
    "ARMOR",
    "UNCOMMON",
    2,
    130,
    "FEET",
    { vitalityBonus: 3, speedBonus: 2, defenseBonus: 3 }
  );

  const steelGloves = await createGearItem(
    "steel-gloves",
    "steel-gloves",
    "Steel Gauntlets",
    "Precise steel gauntlets.",
    "ARMOR",
    "UNCOMMON",
    2,
    120,
    "ARMS",
    { strengthBonus: 2, dexterityBonus: 2 }
  );

  const steelShield = await createGearItem(
    "steel-shield",
    "steel-shield",
    "Steel Shield",
    "A formidable steel shield.",
    "ARMOR",
    "RARE",
    2,
    200,
    "OFFHAND",
    { vitalityBonus: 5, defenseBonus: 8 }
  );

  // Tier 3 Armor (Levels 41-60)
  const gildedHelm = await createGearItem(
    "gilded-helm",
    "gilded-helm",
    "Gilded Helm",
    "An ornate helm with gold accents.",
    "ARMOR",
    "RARE",
    3,
    280,
    "HEAD",
    { vitalityBonus: 5, defenseBonus: 4, dexterityBonus: 1 }
  );

  const silverChestplate = await createGearItem(
    "silver-chestplate",
    "silver-chestplate",
    "Silver Chestplate",
    "A beautifully crafted silver chestplate.",
    "ARMOR",
    "RARE",
    3,
    400,
    "BODY",
    { vitalityBonus: 9, defenseBonus: 7, dexterityBonus: 2 }
  );

  // Tier 4 Armor (Levels 61-80)
  const mithrilHelm = await createGearItem(
    "mithril-helm",
    "mithril-helm",
    "Mithril Helm",
    "An elegant mithril helmet.",
    "ARMOR",
    "EPIC",
    4,
    550,
    "HEAD",
    { vitalityBonus: 7, defenseBonus: 6, speedBonus: 2 }
  );

  const mithrilChestplate = await createGearItem(
    "mithril-chestplate",
    "mithril-chestplate",
    "Mithril Chestplate",
    "An exquisite mithril chestplate.",
    "ARMOR",
    "EPIC",
    4,
    750,
    "BODY",
    { vitalityBonus: 12, defenseBonus: 10, speedBonus: 3 }
  );

  const mithrilLegs = await createGearItem(
    "mithril-legs",
    "mithril-legs",
    "Mithril Legguards",
    "Lightweight mithril leg armor.",
    "ARMOR",
    "EPIC",
    4,
    650,
    "LEGS",
    { vitalityBonus: 10, defenseBonus: 8, speedBonus: 2 }
  );

  const mithrilBoots = await createGearItem(
    "mithril-boots",
    "mithril-boots",
    "Mithril Boots",
    "Graceful mithril boots.",
    "ARMOR",
    "EPIC",
    4,
    500,
    "FEET",
    { vitalityBonus: 5, speedBonus: 5, defenseBonus: 5 }
  );

  const mithrilShield = await createGearItem(
    "mithril-shield",
    "mithril-shield",
    "Mithril Shield",
    "A legendary mithril shield.",
    "ARMOR",
    "EPIC",
    4,
    700,
    "OFFHAND",
    { vitalityBonus: 8, defenseBonus: 12, speedBonus: 2 }
  );

  // Tier 5 Armor (Levels 81-100)
  const runedArmor = await createGearItem(
    "runed-armor",
    "runed-armor",
    "Runed Armor",
    "Armor inscribed with powerful runes.",
    "ARMOR",
    "LEGENDARY",
    5,
    1500,
    "BODY",
    { vitalityBonus: 18, defenseBonus: 15, strengthBonus: 5, dexterityBonus: 3 }
  );

  // Additional Armor for expanded recipe set
  const ironGloves = await createGearItem(
    "iron-gloves",
    "iron-gloves",
    "Iron Gauntlets",
    "Protective iron gauntlets.",
    "ARMOR",
    "UNCOMMON",
    2,
    60,
    "ARMS",
    { strengthBonus: 2, defenseBonus: 3 }
  );

  const silverHelm = await createGearItem(
    "silver-helm",
    "silver-helm",
    "Silver Helm",
    "An elegant silver helmet.",
    "ARMOR",
    "RARE",
    3,
    180,
    "HEAD",
    { vitalityBonus: 4, defenseBonus: 5 }
  );

  const silverLegs = await createGearItem(
    "silver-legs",
    "silver-legs",
    "Silver Legguards",
    "Elegant silver leg armor.",
    "ARMOR",
    "RARE",
    3,
    220,
    "LEGS",
    { vitalityBonus: 5, defenseBonus: 6 }
  );

  const silverBoots = await createGearItem(
    "silver-boots",
    "silver-boots",
    "Silver Boots",
    "Elegant silver boots.",
    "ARMOR",
    "RARE",
    3,
    160,
    "FEET",
    { vitalityBonus: 3, speedBonus: 2, defenseBonus: 4 }
  );

  const gildedChestplate = await createGearItem(
    "gilded-chestplate",
    "gilded-chestplate",
    "Gilded Chestplate",
    "An ornate chestplate with gold accents.",
    "ARMOR",
    "RARE",
    3,
    250,
    "BODY",
    { vitalityBonus: 8, defenseBonus: 8 }
  );

  const mithrilGloves = await createGearItem(
    "mithril-gloves",
    "mithril-gloves",
    "Mithril Gauntlets",
    "Legendary mithril gauntlets.",
    "ARMOR",
    "EPIC",
    4,
    320,
    "ARMS",
    { strengthBonus: 5, dexterityBonus: 4, defenseBonus: 8 }
  );

  const legendaryHelm = await createGearItem(
    "legendary-helm",
    "legendary-helm",
    "Legendary Helm",
    "A helm forged from celestial materials.",
    "ARMOR",
    "LEGENDARY",
    5,
    700,
    "HEAD",
    { vitalityBonus: 12, defenseBonus: 12 }
  );

  const runedChestplate = await createGearItem(
    "runed-chestplate",
    "runed-chestplate",
    "Runed Chestplate",
    "A chestplate inscribed with powerful runes.",
    "ARMOR",
    "LEGENDARY",
    5,
    850,
    "BODY",
    { vitalityBonus: 15, defenseBonus: 15 }
  );

  const celestialLegs = await createGearItem(
    "celestial-legs",
    "celestial-legs",
    "Celestial Legguards",
    "Leg armor forged from celestial mithril.",
    "ARMOR",
    "LEGENDARY",
    5,
    900,
    "LEGS",
    { vitalityBonus: 14, speedBonus: 4, defenseBonus: 14 }
  );

  const legendaryBoots = await createGearItem(
    "legendary-boots",
    "legendary-boots",
    "Legendary Boots",
    "Boots forged from celestial materials.",
    "ARMOR",
    "LEGENDARY",
    5,
    750,
    "FEET",
    { vitalityBonus: 10, speedBonus: 6, defenseBonus: 10 }
  );

  const runedShield = await createGearItem(
    "runed-shield",
    "runed-shield",
    "Runed Shield",
    "A shield inscribed with powerful runes.",
    "ARMOR",
    "LEGENDARY",
    5,
    950,
    "OFFHAND",
    { vitalityBonus: 12, defenseBonus: 18 }
  );

  // Tools (Miner synergy)
  const bronzePickaxe = await createGearItem(
    "bronze-pickaxe",
    "bronze-pickaxe",
    "Bronze Pickaxe",
    "A basic bronze pickaxe for mining.",
    "TOOL",
    "COMMON",
    1,
    50,
    "MAINHAND",
    { strengthBonus: 2 }
  );

  const ironPickaxe = await createGearItem(
    "iron-pickaxe",
    "iron-pickaxe",
    "Iron Pickaxe",
    "A sturdy iron pickaxe for mining.",
    "TOOL",
    "UNCOMMON",
    2,
    100,
    "MAINHAND",
    { strengthBonus: 4 }
  );

  const steelPickaxe = await createGearItem(
    "steel-pickaxe",
    "steel-pickaxe",
    "Steel Pickaxe",
    "An efficient steel pickaxe for mining.",
    "TOOL",
    "UNCOMMON",
    2,
    180,
    "MAINHAND",
    { strengthBonus: 6 }
  );

  const mithrilPickaxe = await createGearItem(
    "mithril-pickaxe",
    "mithril-pickaxe",
    "Mithril Pickaxe",
    "A legendary mithril pickaxe for mining.",
    "TOOL",
    "EPIC",
    4,
    600,
    "MAINHAND",
    { strengthBonus: 10, speedBonus: 3 }
  );

  // ==========================================
  // SMELTER RECIPES (Bars)
  // ==========================================
  
  // Tier 1 Bars (Levels 1-20)
  await createRecipe(
    "tin-bar-recipe",
    "Tin Bar",
    "Smelt tin ore into a refined tin bar.",
    blacksmithJob.id,
    1,
    3,
    "SMELTER",
    35,
    18,
    tinBar.id,
    1,
    [{ itemId: tinOre.id, qty: 3 }, { itemId: coal.id, qty: 1 }],
    false
  );

  await createRecipe(
    "steel-bar-recipe",
    "Steel Bar",
    "Smelt iron ore and coal into a steel bar.",
    blacksmithJob.id,
    3,
    20,
    "SMELTER",
    75,
    40,
    steelBar.id,
    1,
    [{ itemId: ironOre.id, qty: 3 }, { itemId: coal.id, qty: 3 }],
    false
  );

  // Tier 2 Bars (Levels 21-40)
  await createRecipe(
    "silver-bar-recipe",
    "Silver Bar",
    "Smelt silver ore into a refined silver bar.",
    blacksmithJob.id,
    2,
    25,
    "SMELTER",
    90,
    45,
    silverBar.id,
    1,
    [{ itemId: silverOre.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    false
  );

  await createRecipe(
    "gold-bar-recipe",
    "Gold Bar",
    "Smelt gold ore into a refined gold bar.",
    blacksmithJob.id,
    2,
    30,
    "SMELTER",
    105,
    50,
    goldBar.id,
    1,
    [{ itemId: goldOre.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    false
  );

  // Tier 4 Bars (Levels 61-80)
  await createRecipe(
    "mithril-bar-recipe",
    "Mithril Bar",
    "Smelt mithril ore into a refined mithril bar.",
    blacksmithJob.id,
    4,
    65,
    "SMELTER",
    360,
    180,
    mithrilBar.id,
    1,
    [{ itemId: mithrilOre.id, qty: 4 }, { itemId: coal.id, qty: 3 }],
    false
  );

  // ==========================================
  // ANVIL RECIPES - Components
  // ==========================================

  // Tier 2 Components (Levels 21-40)
  await createRecipe(
    "rivets-recipe",
    "Iron Rivets",
    "Craft iron rivets from iron bars.",
    blacksmithJob.id,
    2,
    22,
    "ANVIL",
    45,
    35,
    rivets.id,
    6,
    [{ itemId: ironBar.id, qty: 1 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "plate-recipe",
    "Steel Plate",
    "Forge a reinforced steel plate.",
    blacksmithJob.id,
    3,
    32,
    "ANVIL",
    60,
    50,
    plate.id,
    1,
    [{ itemId: steelBar.id, qty: 2 }, { itemId: stone.id, qty: 2 }],
    true
  );

  // Tier 3 Components (Levels 41-60)
  await createRecipe(
    "gem-setting-ruby-recipe",
    "Ruby Gem Setting",
    "Create a silver setting for quartz crystals.",
    blacksmithJob.id,
    3,
    48,
    "ANVIL",
    75,
    60,
    gemSettingRuby.id,
    1,
    [{ itemId: silverBar.id, qty: 1 }, { itemId: quartz.id, qty: 1 }],
    true
  );

  await createRecipe(
    "gem-setting-sapphire-recipe",
    "Sapphire Gem Setting",
    "Create a silver setting for geode crystals.",
    blacksmithJob.id,
    3,
    53,
    "ANVIL",
    80,
    65,
    gemSettingSapphire.id,
    1,
    [{ itemId: silverBar.id, qty: 1 }, { itemId: geodeCrystal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "gilded-hilt-recipe",
    "Gilded Hilt",
    "Craft an ornate hilt with gold accents.",
    blacksmithJob.id,
    3,
    46,
    "ANVIL",
    70,
    55,
    gildedHilt.id,
    1,
    [{ itemId: steelBar.id, qty: 2 }, { itemId: goldBar.id, qty: 1 }, { itemId: coal.id, qty: 1 }],
    true
  );

  // Tier 4 Components (Levels 61-80)
  await createRecipe(
    "reinforced-plate-recipe",
    "Reinforced Plate",
    "Forge a heavily reinforced plate.",
    blacksmithJob.id,
    4,
    68,
    "ANVIL",
    120,
    95,
    reinforcedPlate.id,
    1,
    [{ itemId: mithrilBar.id, qty: 2 }, { itemId: steelBar.id, qty: 2 }, { itemId: stone.id, qty: 4 }],
    true
  );

  await createRecipe(
    "mithril-edge-recipe",
    "Mithril Edge",
    "Forge a razor-sharp mithril blade edge.",
    blacksmithJob.id,
    4,
    72,
    "ANVIL",
    135,
    110,
    mithrilEdge.id,
    1,
    [{ itemId: mithrilBar.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "gem-setting-emerald-recipe",
    "Emerald Gem Setting",
    "Create a silver setting for tempest crystals.",
    blacksmithJob.id,
    4,
    70,
    "ANVIL",
    150,
    120,
    gemSettingEmerald.id,
    1,
    [{ itemId: silverBar.id, qty: 2 }, { itemId: tempestCrystal.id, qty: 1 }],
    true
  );

  // Tier 5 Components (Levels 81-100)
  await createRecipe(
    "legendary-core-recipe",
    "Legendary Core",
    "Forge a powerful core from celestial materials.",
    blacksmithJob.id,
    5,
    85,
    "ANVIL",
    240,
    200,
    legendaryCore.id,
    1,
    [{ itemId: celestialMithril.id, qty: 2 }, { itemId: starMetal.id, qty: 1 }, { itemId: coal.id, qty: 4 }],
    true
  );

  await createRecipe(
    "runed-plate-recipe",
    "Runed Plate",
    "Inscribe a plate with ancient runes.",
    blacksmithJob.id,
    5,
    90,
    "ANVIL",
    300,
    250,
    runedPlate.id,
    1,
    [{ itemId: mithrilBar.id, qty: 4 }, { itemId: runestone.id, qty: 2 }, { itemId: coal.id, qty: 3 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Weapons (Tier 1: Levels 1-20)
  // ==========================================

  await createRecipe(
    "bronze-dagger-recipe",
    "Bronze Dagger",
    "Forge a lightweight bronze dagger.",
    blacksmithJob.id,
    1,
    3,
    "ANVIL",
    40,
    25,
    bronzeDagger.id,
    1,
    [{ itemId: bronzeBar.id, qty: 2 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "bronze-shortsword-recipe",
    "Bronze Shortsword",
    "Forge a simple bronze shortsword.",
    blacksmithJob.id,
    2,
    5,
    "ANVIL",
    50,
    30,
    bronzeShortsword.id,
    1,
    [{ itemId: bronzeBar.id, qty: 3 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "bronze-mace-recipe",
    "Bronze Mace",
    "Forge a heavy bronze mace.",
    blacksmithJob.id,
    2,
    7,
    "ANVIL",
    55,
    32,
    bronzeMace.id,
    1,
    [{ itemId: bronzeBar.id, qty: 4 }, { itemId: stone.id, qty: 1 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-dagger-recipe",
    "Iron Dagger",
    "Forge a sturdy iron dagger.",
    blacksmithJob.id,
    2,
    12,
    "ANVIL",
    60,
    35,
    ironDagger.id,
    1,
    [{ itemId: ironBar.id, qty: 2 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-shortsword-recipe",
    "Iron Shortsword",
    "Forge a well-balanced iron shortsword.",
    blacksmithJob.id,
    3,
    18,
    "ANVIL",
    75,
    45,
    ironShortsword.id,
    1,
    [{ itemId: ironBar.id, qty: 4 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-mace-recipe",
    "Iron Mace",
    "Forge a heavy iron mace.",
    blacksmithJob.id,
    3,
    16,
    "ANVIL",
    70,
    42,
    ironMace.id,
    1,
    [{ itemId: ironBar.id, qty: 5 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 1 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Weapons (Tier 2: Levels 21-40)
  // ==========================================

  await createRecipe(
    "steel-dagger-recipe",
    "Steel Dagger",
    "Forge a sharp steel dagger.",
    blacksmithJob.id,
    3,
    24,
    "ANVIL",
    85,
    50,
    steelDagger.id,
    1,
    [{ itemId: steelBar.id, qty: 2 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "steel-shortsword-recipe",
    "Steel Shortsword",
    "Forge a refined steel shortsword.",
    blacksmithJob.id,
    3,
    28,
    "ANVIL",
    95,
    58,
    steelShortsword.id,
    1,
    [{ itemId: steelBar.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "steel-mace-recipe",
    "Steel Mace",
    "Forge a powerful steel mace.",
    blacksmithJob.id,
    3,
    32,
    "ANVIL",
    105,
    65,
    steelMace.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "iron-warhammer-recipe",
    "Iron Warhammer",
    "Forge a massive iron warhammer.",
    blacksmithJob.id,
    4,
    34,
    "ANVIL",
    115,
    70,
    ironWarhammer.id,
    1,
    [{ itemId: ironBar.id, qty: 6 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "steel-warhammer-recipe",
    "Steel Warhammer",
    "Forge a devastating steel warhammer.",
    blacksmithJob.id,
    4,
    38,
    "ANVIL",
    130,
    80,
    steelWarhammer.id,
    1,
    [{ itemId: steelBar.id, qty: 5 }, { itemId: stone.id, qty: 4 }, { itemId: coal.id, qty: 3 }],
    true
  );

  await createRecipe(
    "steel-greatsword-recipe",
    "Steel Greatsword",
    "Forge a massive steel greatsword.",
    blacksmithJob.id,
    4,
    36,
    "ANVIL",
    125,
    75,
    steelGreatsword.id,
    1,
    [{ itemId: steelBar.id, qty: 6 }, { itemId: coal.id, qty: 3 }],
    true
  );

  await createRecipe(
    "iron-spear-recipe",
    "Iron Spear",
    "Forge a long iron spear.",
    blacksmithJob.id,
    3,
    26,
    "ANVIL",
    90,
    55,
    ironSpear.id,
    1,
    [{ itemId: ironBar.id, qty: 3 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "steel-spear-recipe",
    "Steel Spear",
    "Forge a precise steel spear.",
    blacksmithJob.id,
    3,
    30,
    "ANVIL",
    100,
    62,
    steelSpear.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Weapons (Tier 3: Levels 41-60)
  // ==========================================

  await createRecipe(
    "gilded-blade-recipe",
    "Gilded Blade",
    "Forge an elegant blade with gold accents.",
    blacksmithJob.id,
    4,
    48,
    "ANVIL",
    140,
    90,
    gildedBlade.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: goldBar.id, qty: 1 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "silver-shortsword-recipe",
    "Silver Shortsword",
    "Forge a finely crafted silver shortsword.",
    blacksmithJob.id,
    4,
    50,
    "ANVIL",
    150,
    95,
    silverShortsword.id,
    1,
    [{ itemId: silverBar.id, qty: 5 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "socketed-sword-ruby-recipe",
    "Socketed Sword (Ruby)",
    "Forge a sword with a quartz crystal socket.",
    blacksmithJob.id,
    4,
    55,
    "ANVIL",
    160,
    105,
    socketedSwordRuby.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: gemSettingRuby.id, qty: 1 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "socketed-sword-sapphire-recipe",
    "Socketed Sword (Sapphire)",
    "Forge a sword with a geode crystal socket.",
    blacksmithJob.id,
    4,
    58,
    "ANVIL",
    170,
    115,
    socketedSwordSapphire.id,
    1,
    [{ itemId: steelBar.id, qty: 5 }, { itemId: gemSettingSapphire.id, qty: 1 }, { itemId: coal.id, qty: 3 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Weapons (Tier 4: Levels 61-80)
  // ==========================================

  await createRecipe(
    "mithril-dagger-recipe",
    "Mithril Dagger",
    "Forge a razor-sharp mithril dagger.",
    blacksmithJob.id,
    5,
    66,
    "ANVIL",
    180,
    130,
    mithrilDagger.id,
    1,
    [{ itemId: mithrilBar.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "mithril-longsword-recipe",
    "Mithril Longsword",
    "Forge an exquisite mithril longsword.",
    blacksmithJob.id,
    5,
    70,
    "ANVIL",
    200,
    150,
    mithrilLongsword.id,
    1,
    [{ itemId: mithrilBar.id, qty: 6 }, { itemId: coal.id, qty: 4 }],
    true
  );

  await createRecipe(
    "mithril-greatsword-recipe",
    "Mithril Greatsword",
    "Forge a legendary mithril greatsword.",
    blacksmithJob.id,
    5,
    74,
    "ANVIL",
    220,
    170,
    mithrilGreatsword.id,
    1,
    [{ itemId: mithrilBar.id, qty: 8 }, { itemId: coal.id, qty: 5 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Weapons (Tier 5: Levels 81-100)
  // ==========================================

  await createRecipe(
    "runed-greatsword-recipe",
    "Runed Greatsword",
    "Forge a greatsword inscribed with ancient runes.",
    blacksmithJob.id,
    5,
    92,
    "ANVIL",
    280,
    220,
    runedGreatsword.id,
    1,
    [{ itemId: mithrilBar.id, qty: 10 }, { itemId: goldBar.id, qty: 2 }, { itemId: quartz.id, qty: 1 }, { itemId: geodeCrystal.id, qty: 1 }, { itemId: coal.id, qty: 6 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Armor (Tier 1: Levels 1-20)
  // ==========================================

  await createRecipe(
    "bronze-helm-recipe",
    "Bronze Helm",
    "Forge a basic bronze helmet.",
    blacksmithJob.id,
    1,
    6,
    "ANVIL",
    50,
    28,
    bronzeHelm.id,
    1,
    [{ itemId: bronzeBar.id, qty: 3 }, { itemId: stone.id, qty: 1 }],
    true
  );

  await createRecipe(
    "bronze-chestplate-recipe",
    "Bronze Chestplate",
    "Forge a simple bronze chestplate.",
    blacksmithJob.id,
    2,
    8,
    "ANVIL",
    70,
    40,
    bronzeChestplate.id,
    1,
    [{ itemId: bronzeBar.id, qty: 5 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "bronze-legs-recipe",
    "Bronze Legguards",
    "Forge basic bronze leg protection.",
    blacksmithJob.id,
    2,
    7,
    "ANVIL",
    60,
    35,
    bronzeLegs.id,
    1,
    [{ itemId: bronzeBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "bronze-boots-recipe",
    "Bronze Boots",
    "Forge sturdy bronze boots.",
    blacksmithJob.id,
    1,
    9,
    "ANVIL",
    45,
    25,
    bronzeBoots.id,
    1,
    [{ itemId: bronzeBar.id, qty: 2 }, { itemId: stone.id, qty: 1 }],
    true
  );

  await createRecipe(
    "bronze-gloves-recipe",
    "Bronze Gauntlets",
    "Forge heavy bronze gauntlets.",
    blacksmithJob.id,
    1,
    10,
    "ANVIL",
    40,
    22,
    bronzeGloves.id,
    1,
    [{ itemId: bronzeBar.id, qty: 2 }],
    true
  );

  await createRecipe(
    "bronze-shield-recipe",
    "Bronze Shield",
    "Forge a round bronze shield.",
    blacksmithJob.id,
    2,
    11,
    "ANVIL",
    65,
    38,
    bronzeShield.id,
    1,
    [{ itemId: bronzeBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "iron-helm-recipe",
    "Iron Helm",
    "Forge a sturdy iron helmet.",
    blacksmithJob.id,
    2,
    13,
    "ANVIL",
    75,
    42,
    ironHelm.id,
    1,
    [{ itemId: ironBar.id, qty: 3 }, { itemId: stone.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-chestplate-recipe",
    "Iron Chestplate",
    "Forge a well-crafted iron chestplate.",
    blacksmithJob.id,
    3,
    17,
    "ANVIL",
    100,
    58,
    ironChestplate.id,
    1,
    [{ itemId: ironBar.id, qty: 6 }, { itemId: rivets.id, qty: 4 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "iron-legs-recipe",
    "Iron Legguards",
    "Forge protective iron leg armor.",
    blacksmithJob.id,
    3,
    15,
    "ANVIL",
    90,
    52,
    ironLegs.id,
    1,
    [{ itemId: ironBar.id, qty: 5 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "iron-boots-recipe",
    "Iron Boots",
    "Forge reinforced iron boots.",
    blacksmithJob.id,
    2,
    14,
    "ANVIL",
    70,
    40,
    ironBoots.id,
    1,
    [{ itemId: ironBar.id, qty: 3 }, { itemId: stone.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-shield-recipe",
    "Iron Shield",
    "Forge a heavy iron shield.",
    blacksmithJob.id,
    3,
    19,
    "ANVIL",
    110,
    65,
    ironShield.id,
    1,
    [{ itemId: ironBar.id, qty: 5 }, { itemId: stone.id, qty: 3 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Armor (Tier 2: Levels 21-40)
  // ==========================================

  await createRecipe(
    "steel-helm-recipe",
    "Steel Helm",
    "Forge a reinforced steel helmet.",
    blacksmithJob.id,
    3,
    23,
    "ANVIL",
    105,
    62,
    steelHelm.id,
    1,
    [{ itemId: steelBar.id, qty: 3 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "steel-chestplate-recipe",
    "Steel Chestplate",
    "Forge a masterfully crafted steel chestplate.",
    blacksmithJob.id,
    4,
    27,
    "ANVIL",
    140,
    85,
    steelChestplate.id,
    1,
    [{ itemId: steelBar.id, qty: 7 }, { itemId: rivets.id, qty: 6 }, { itemId: stone.id, qty: 3 }],
    true
  );

  await createRecipe(
    "steel-legs-recipe",
    "Steel Legguards",
    "Forge excellent steel leg protection.",
    blacksmithJob.id,
    3,
    25,
    "ANVIL",
    120,
    72,
    steelLegs.id,
    1,
    [{ itemId: steelBar.id, qty: 6 }, { itemId: stone.id, qty: 3 }],
    true
  );

  await createRecipe(
    "steel-boots-recipe",
    "Steel Boots",
    "Forge durable steel boots.",
    blacksmithJob.id,
    3,
    24,
    "ANVIL",
    100,
    60,
    steelBoots.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "steel-gloves-recipe",
    "Steel Gauntlets",
    "Forge precise steel gauntlets.",
    blacksmithJob.id,
    3,
    26,
    "ANVIL",
    95,
    58,
    steelGloves.id,
    1,
    [{ itemId: steelBar.id, qty: 3 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "steel-shield-recipe",
    "Steel Shield",
    "Forge a formidable steel shield.",
    blacksmithJob.id,
    4,
    29,
    "ANVIL",
    150,
    90,
    steelShield.id,
    1,
    [{ itemId: steelBar.id, qty: 5 }, { itemId: plate.id, qty: 1 }, { itemId: stone.id, qty: 3 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Armor (Tier 3: Levels 41-60)
  // ==========================================

  await createRecipe(
    "gilded-helm-recipe",
    "Gilded Helm",
    "Forge an ornate helm with gold accents.",
    blacksmithJob.id,
    4,
    52,
    "ANVIL",
    165,
    100,
    gildedHelm.id,
    1,
    [{ itemId: steelBar.id, qty: 3 }, { itemId: goldBar.id, qty: 1 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "silver-chestplate-recipe",
    "Silver Chestplate",
    "Forge a beautifully crafted silver chestplate.",
    blacksmithJob.id,
    4,
    54,
    "ANVIL",
    180,
    110,
    silverChestplate.id,
    1,
    [{ itemId: silverBar.id, qty: 8 }, { itemId: plate.id, qty: 2 }, { itemId: coal.id, qty: 2 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Armor (Tier 4: Levels 61-80)
  // ==========================================

  await createRecipe(
    "mithril-helm-recipe",
    "Mithril Helm",
    "Forge an elegant mithril helmet.",
    blacksmithJob.id,
    5,
    67,
    "ANVIL",
    190,
    140,
    mithrilHelm.id,
    1,
    [{ itemId: mithrilBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "mithril-chestplate-recipe",
    "Mithril Chestplate",
    "Forge an exquisite mithril chestplate.",
    blacksmithJob.id,
    5,
    75,
    "ANVIL",
    240,
    180,
    mithrilChestplate.id,
    1,
    [{ itemId: mithrilBar.id, qty: 10 }, { itemId: reinforcedPlate.id, qty: 1 }, { itemId: stone.id, qty: 4 }],
    true
  );

  await createRecipe(
    "mithril-legs-recipe",
    "Mithril Legguards",
    "Forge lightweight mithril leg armor.",
    blacksmithJob.id,
    5,
    73,
    "ANVIL",
    220,
    165,
    mithrilLegs.id,
    1,
    [{ itemId: mithrilBar.id, qty: 8 }, { itemId: stone.id, qty: 3 }],
    true
  );

  await createRecipe(
    "mithril-boots-recipe",
    "Mithril Boots",
    "Forge graceful mithril boots.",
    blacksmithJob.id,
    5,
    71,
    "ANVIL",
    200,
    150,
    mithrilBoots.id,
    1,
    [{ itemId: mithrilBar.id, qty: 5 }, { itemId: stone.id, qty: 2 }],
    true
  );

  await createRecipe(
    "mithril-shield-recipe",
    "Mithril Shield",
    "Forge a legendary mithril shield.",
    blacksmithJob.id,
    5,
    77,
    "ANVIL",
    260,
    195,
    mithrilShield.id,
    1,
    [{ itemId: mithrilBar.id, qty: 8 }, { itemId: reinforcedPlate.id, qty: 1 }, { itemId: stone.id, qty: 4 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Armor (Tier 5: Levels 81-100)
  // ==========================================

  await createRecipe(
    "runed-armor-recipe",
    "Runed Armor",
    "Forge armor inscribed with powerful runes.",
    blacksmithJob.id,
    5,
    96,
    "ANVIL",
    300,
    240,
    runedArmor.id,
    1,
    [{ itemId: mithrilBar.id, qty: 14 }, { itemId: reinforcedPlate.id, qty: 2 }, { itemId: tempestCrystal.id, qty: 2 }, { itemId: coal.id, qty: 8 }],
    true
  );

  // ==========================================
  // ANVIL RECIPES - Tools (Miner synergy)
  // ==========================================

  await createRecipe(
    "bronze-pickaxe-recipe",
    "Bronze Pickaxe",
    "Forge a basic bronze pickaxe for mining.",
    blacksmithJob.id,
    2,
    8,
    "ANVIL",
    60,
    35,
    bronzePickaxe.id,
    1,
    [{ itemId: bronzeBar.id, qty: 3 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-pickaxe-recipe",
    "Iron Pickaxe",
    "Forge a sturdy iron pickaxe for mining.",
    blacksmithJob.id,
    3,
    26,
    "ANVIL",
    95,
    58,
    ironPickaxe.id,
    1,
    [{ itemId: ironBar.id, qty: 4 }, { itemId: stone.id, qty: 4 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "steel-pickaxe-recipe",
    "Steel Pickaxe",
    "Forge an efficient steel pickaxe for mining.",
    blacksmithJob.id,
    3,
    38,
    "ANVIL",
    125,
    75,
    steelPickaxe.id,
    1,
    [{ itemId: steelBar.id, qty: 4 }, { itemId: stone.id, qty: 5 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "mithril-pickaxe-recipe",
    "Mithril Pickaxe",
    "Forge a legendary mithril pickaxe for mining.",
    blacksmithJob.id,
    5,
    78,
    "ANVIL",
    250,
    190,
    mithrilPickaxe.id,
    1,
    [{ itemId: mithrilBar.id, qty: 5 }, { itemId: stone.id, qty: 6 }, { itemId: coal.id, qty: 3 }],
    true
  );

  // ==========================================
  // ADDITIONAL RECIPES TO REACH 80-110 TARGET
  // ==========================================

  // Tier 1-2 Additional Weapons
  await createRecipe(
    "bronze-longsword-recipe",
    "Bronze Longsword",
    "Forge a basic bronze longsword.",
    blacksmithJob.id,
    2,
    9,
    "ANVIL",
    60,
    35,
    bronzeLongsword.id,
    1,
    [{ itemId: bronzeBar.id, qty: 4 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "iron-longsword-recipe",
    "Iron Longsword",
    "Forge a reliable iron longsword.",
    blacksmithJob.id,
    3,
    20,
    "ANVIL",
    85,
    50,
    ironLongsword.id,
    1,
    [{ itemId: ironBar.id, qty: 5 }, { itemId: coal.id, qty: 2 }],
    true
  );


  // Tier 3 Additional Weapons
  await createRecipe(
    "silver-dagger-recipe",
    "Silver Dagger",
    "Forge an elegant silver dagger.",
    blacksmithJob.id,
    4,
    44,
    "ANVIL",
    130,
    82,
    silverDagger.id,
    1,
    [{ itemId: silverBar.id, qty: 3 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "gilded-mace-recipe",
    "Gilded Mace",
    "Forge an ornate mace with gold accents.",
    blacksmithJob.id,
    4,
    49,
    "ANVIL",
    145,
    92,
    gildedMace.id,
    1,
    [{ itemId: steelBar.id, qty: 5 }, { itemId: goldBar.id, qty: 1 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "silver-spear-recipe",
    "Silver Spear",
    "Forge an elegant silver spear.",
    blacksmithJob.id,
    4,
    51,
    "ANVIL",
    155,
    98,
    silverSpear.id,
    1,
    [{ itemId: silverBar.id, qty: 4 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "socketed-sword-emerald-recipe",
    "Socketed Sword (Emerald)",
    "Forge a sword with a tempest crystal socket.",
    blacksmithJob.id,
    4,
    60,
    "ANVIL",
    180,
    120,
    socketedSwordEmerald.id,
    1,
    [{ itemId: steelBar.id, qty: 6 }, { itemId: gemSettingEmerald.id, qty: 1 }, { itemId: coal.id, qty: 3 }],
    true
  );

  // Tier 4 Additional Weapons
  await createRecipe(
    "mithril-shortsword-recipe",
    "Mithril Shortsword",
    "Forge a precise mithril shortsword.",
    blacksmithJob.id,
    5,
    64,
    "ANVIL",
    175,
    125,
    mithrilShortsword.id,
    1,
    [{ itemId: mithrilBar.id, qty: 5 }, { itemId: coal.id, qty: 3 }],
    true
  );

  await createRecipe(
    "mithril-mace-recipe",
    "Mithril Mace",
    "Forge a legendary mithril mace.",
    blacksmithJob.id,
    5,
    68,
    "ANVIL",
    190,
    140,
    mithrilMace.id,
    1,
    [{ itemId: mithrilBar.id, qty: 7 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 4 }],
    true
  );

  await createRecipe(
    "mithril-warhammer-recipe",
    "Mithril Warhammer",
    "Forge a devastating mithril warhammer.",
    blacksmithJob.id,
    5,
    72,
    "ANVIL",
    210,
    160,
    mithrilWarhammer.id,
    1,
    [{ itemId: mithrilBar.id, qty: 9 }, { itemId: stone.id, qty: 4 }, { itemId: coal.id, qty: 5 }],
    true
  );

  await createRecipe(
    "mithril-spear-recipe",
    "Mithril Spear",
    "Forge a legendary mithril spear.",
    blacksmithJob.id,
    5,
    76,
    "ANVIL",
    230,
    175,
    mithrilSpear.id,
    1,
    [{ itemId: mithrilBar.id, qty: 7 }, { itemId: stone.id, qty: 5 }, { itemId: coal.id, qty: 4 }],
    true
  );

  // Tier 5 Additional Weapons
  await createRecipe(
    "legendary-blade-recipe",
    "Legendary Blade",
    "Forge a blade forged from celestial materials.",
    blacksmithJob.id,
    5,
    84,
    "ANVIL",
    260,
    210,
    legendaryBlade.id,
    1,
    [{ itemId: legendaryCore.id, qty: 1 }, { itemId: mithrilBar.id, qty: 8 }, { itemId: coal.id, qty: 5 }],
    true
  );

  await createRecipe(
    "runed-longsword-recipe",
    "Runed Longsword",
    "Forge a longsword inscribed with ancient runes.",
    blacksmithJob.id,
    5,
    88,
    "ANVIL",
    290,
    230,
    runedLongsword.id,
    1,
    [{ itemId: mithrilBar.id, qty: 12 }, { itemId: runedPlate.id, qty: 1 }, { itemId: coal.id, qty: 7 }],
    true
  );

  await createRecipe(
    "celestial-greatsword-recipe",
    "Celestial Greatsword",
    "Forge a greatsword from celestial mithril.",
    blacksmithJob.id,
    5,
    94,
    "ANVIL",
    320,
    260,
    celestialGreatsword.id,
    1,
    [{ itemId: celestialMithril.id, qty: 3 }, { itemId: mithrilBar.id, qty: 10 }, { itemId: coal.id, qty: 8 }],
    true
  );

  // Tier 2-3 Additional Armor
  await createRecipe(
    "iron-gloves-recipe",
    "Iron Gauntlets",
    "Forge protective iron gauntlets.",
    blacksmithJob.id,
    2,
    16,
    "ANVIL",
    85,
    48,
    ironGloves.id,
    1,
    [{ itemId: ironBar.id, qty: 4 }, { itemId: coal.id, qty: 1 }],
    true
  );

  await createRecipe(
    "silver-helm-recipe",
    "Silver Helm",
    "Forge an elegant silver helmet.",
    blacksmithJob.id,
    4,
    46,
    "ANVIL",
    140,
    88,
    silverHelm.id,
    1,
    [{ itemId: silverBar.id, qty: 4 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "silver-legs-recipe",
    "Silver Legguards",
    "Forge elegant silver leg armor.",
    blacksmithJob.id,
    4,
    56,
    "ANVIL",
    175,
    108,
    silverLegs.id,
    1,
    [{ itemId: silverBar.id, qty: 7 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "silver-boots-recipe",
    "Silver Boots",
    "Forge elegant silver boots.",
    blacksmithJob.id,
    4,
    48,
    "ANVIL",
    135,
    85,
    silverBoots.id,
    1,
    [{ itemId: silverBar.id, qty: 3 }, { itemId: stone.id, qty: 2 }, { itemId: coal.id, qty: 2 }],
    true
  );

  await createRecipe(
    "gilded-chestplate-recipe",
    "Gilded Chestplate",
    "Forge an ornate chestplate with gold accents.",
    blacksmithJob.id,
    4,
    50,
    "ANVIL",
    160,
    100,
    gildedChestplate.id,
    1,
    [{ itemId: steelBar.id, qty: 6 }, { itemId: goldBar.id, qty: 2 }, { itemId: plate.id, qty: 1 }, { itemId: coal.id, qty: 2 }],
    true
  );

  // Tier 4 Additional Armor
  await createRecipe(
    "mithril-gloves-recipe",
    "Mithril Gauntlets",
    "Forge legendary mithril gauntlets.",
    blacksmithJob.id,
    5,
    69,
    "ANVIL",
    205,
    152,
    mithrilGloves.id,
    1,
    [{ itemId: mithrilBar.id, qty: 6 }, { itemId: coal.id, qty: 3 }],
    true
  );

  // Tier 5 Additional Armor
  await createRecipe(
    "legendary-helm-recipe",
    "Legendary Helm",
    "Forge a helm from celestial materials.",
    blacksmithJob.id,
    5,
    82,
    "ANVIL",
    250,
    205,
    legendaryHelm.id,
    1,
    [{ itemId: legendaryCore.id, qty: 1 }, { itemId: mithrilBar.id, qty: 5 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 4 }],
    true
  );

  await createRecipe(
    "runed-chestplate-recipe",
    "Runed Chestplate",
    "Forge a chestplate inscribed with powerful runes.",
    blacksmithJob.id,
    5,
    93,
    "ANVIL",
    310,
    250,
    runedChestplate.id,
    1,
    [{ itemId: runedPlate.id, qty: 2 }, { itemId: mithrilBar.id, qty: 12 }, { itemId: reinforcedPlate.id, qty: 1 }, { itemId: coal.id, qty: 7 }],
    true
  );

  await createRecipe(
    "celestial-legs-recipe",
    "Celestial Legguards",
    "Forge leg armor from celestial mithril.",
    blacksmithJob.id,
    5,
    97,
    "ANVIL",
    340,
    275,
    celestialLegs.id,
    1,
    [{ itemId: celestialMithril.id, qty: 2 }, { itemId: mithrilBar.id, qty: 10 }, { itemId: stone.id, qty: 5 }, { itemId: coal.id, qty: 8 }],
    true
  );

  await createRecipe(
    "legendary-boots-recipe",
    "Legendary Boots",
    "Forge boots from celestial materials.",
    blacksmithJob.id,
    5,
    86,
    "ANVIL",
    270,
    220,
    legendaryBoots.id,
    1,
    [{ itemId: legendaryCore.id, qty: 1 }, { itemId: mithrilBar.id, qty: 6 }, { itemId: stone.id, qty: 3 }, { itemId: coal.id, qty: 5 }],
    true
  );

  await createRecipe(
    "runed-shield-recipe",
    "Runed Shield",
    "Forge a shield inscribed with powerful runes.",
    blacksmithJob.id,
    5,
    98,
    "ANVIL",
    350,
    285,
    runedShield.id,
    1,
    [{ itemId: runedPlate.id, qty: 2 }, { itemId: mithrilBar.id, qty: 14 }, { itemId: reinforcedPlate.id, qty: 2 }, { itemId: coal.id, qty: 9 }],
    true
  );

  console.log("✅ Created full Blacksmith recipe pack (100+ recipes)");

  // Tailor: Cloth -> Cloth Shirt
  const clothShirtRecipe = await prisma.recipe.upsert({
    where: { id: "cloth-shirt-recipe" },
    update: {},
    create: {
      id: "cloth-shirt-recipe",
      jobId: tailorJob.id,
      name: "Cloth Shirt",
      description: "Craft a basic cloth shirt.",
      difficulty: 1,
      outputItemId: clothShirt.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${clothShirtRecipe.id}-cloth` },
    update: {},
    create: {
      id: `${clothShirtRecipe.id}-cloth`,
      recipeId: clothShirtRecipe.id,
      itemId: cloth.id,
      qty: 3,
    },
  });

  // Legacy Alchemist recipe (will be updated by template generation below)
  // Keeping for backward compatibility - template system will update it with new fields

  // Cook: Fish -> Cooked Fish
  const cookedFishRecipe = await prisma.recipe.upsert({
    where: { id: "cooked-fish-recipe" },
    update: {},
    create: {
      id: "cooked-fish-recipe",
      jobId: cookJob.id,
      name: "Cooked Fish",
      description: "Cook a fresh fish.",
      difficulty: 1,
      outputItemId: cookedFish.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${cookedFishRecipe.id}-fish` },
    update: {},
    create: {
      id: `${cookedFishRecipe.id}-fish`,
      recipeId: cookedFishRecipe.id,
      itemId: fish.id,
      qty: 1,
    },
  });

  // ============================================
  // Alchemy System Seed Data
  // ============================================
  console.log("Creating alchemy system seed data...");

  // Alchemy Reagent Items
  const emptyVial = await prisma.item.upsert({
    where: { id: "empty-glass-vial" },
    update: {},
    create: {
      id: "empty-glass-vial",
      key: "empty-glass-vial",
      name: "Empty Glass Vial",
      description: "A clean glass vial ready for alchemical use.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 2,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent", "container"],
    },
  });

  const basicSolvent = await prisma.item.upsert({
    where: { id: "basic-solvent" },
    update: {},
    create: {
      id: "basic-solvent",
      key: "basic-solvent",
      name: "Basic Solvent",
      description: "A basic alchemical solvent for dissolving herbs.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 5,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent"],
    },
  });

  const bindingAgent = await prisma.item.upsert({
    where: { id: "binding-agent" },
    update: {},
    create: {
      id: "binding-agent",
      key: "binding-agent",
      name: "Binding Agent",
      description: "Helps bind ingredients together in alchemical mixtures.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 8,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent"],
    },
  });

  const volatileCatalyst = await prisma.item.upsert({
    where: { id: "volatile-catalyst" },
    update: {},
    create: {
      id: "volatile-catalyst",
      key: "volatile-catalyst",
      name: "Volatile Catalyst",
      description: "A dangerous but potent catalyst for explosive alchemy.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 25,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent", "dangerous"],
    },
  });

  const stabilizingSalt = await prisma.item.upsert({
    where: { id: "stabilizing-salt" },
    update: {},
    create: {
      id: "stabilizing-salt",
      key: "stabilizing-salt",
      name: "Stabilizing Salt",
      description: "Prevents alchemical reactions from going awry.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 2,
      value: 15,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent"],
    },
  });

  const linenWrap = await prisma.item.upsert({
    where: { id: "linen-wrap" },
    update: {},
    create: {
      id: "linen-wrap",
      key: "linen-wrap",
      name: "Linen Wrap",
      description: "Clean linen for creating poultices and salves.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 3,
      stackable: true,
      maxStack: 999,
      tags: ["alchemy", "reagent", "salve"],
    },
  });

  // Alchemy Stations (data-driven)
  const mortarPestle = await prisma.stationDefinition.upsert({
    where: { key: "mortar-pestle" },
    update: {},
    create: {
      key: "mortar-pestle",
      name: "Mortar & Pestle",
      description: "Basic alchemical grinding equipment for beginners.",
      stationType: "ALCHEMY",
      unlockLevel: 1,
      isEnabled: true,
      status: "ACTIVE",
      tags: ["alchemy", "basic", "starter"],
    },
  });

  const alchemyTable = await prisma.stationDefinition.upsert({
    where: { key: "alchemy-table" },
    update: {},
    create: {
      key: "alchemy-table",
      name: "Alchemy Table",
      description: "A proper alchemy workbench for intermediate recipes.",
      stationType: "ALCHEMY",
      unlockLevel: 10,
      isEnabled: true,
      status: "ACTIVE",
      tags: ["alchemy", "intermediate"],
    },
  });

  const distillationApparatus = await prisma.stationDefinition.upsert({
    where: { key: "distillation-apparatus" },
    update: {},
    create: {
      key: "distillation-apparatus",
      name: "Distillation Apparatus",
      description: "Advanced equipment for purifying alchemical mixtures.",
      stationType: "ALCHEMY",
      unlockLevel: 25,
      isEnabled: true,
      status: "ACTIVE",
      tags: ["alchemy", "advanced"],
    },
  });

  const infusionVat = await prisma.stationDefinition.upsert({
    where: { key: "infusion-vat" },
    update: {},
    create: {
      key: "infusion-vat",
      name: "Infusion Vat",
      description: "Large vat for creating powerful elixirs and brews.",
      stationType: "ALCHEMY",
      unlockLevel: 50,
      isEnabled: true,
      status: "ACTIVE",
      tags: ["alchemy", "expert"],
    },
  });

  const masterAlchemyLab = await prisma.stationDefinition.upsert({
    where: { key: "master-alchemy-lab" },
    update: {},
    create: {
      key: "master-alchemy-lab",
      name: "Master Alchemy Lab",
      description: "The pinnacle of alchemical equipment for master craftsmen.",
      stationType: "ALCHEMY",
      unlockLevel: 75,
      isEnabled: true,
      status: "ACTIVE",
      tags: ["alchemy", "master"],
    },
  });

  // Effect Definitions
  const healInstant50 = await prisma.effectDefinition.upsert({
    where: { key: "heal-instant-50" },
    update: {},
    create: {
      key: "heal-instant-50",
      name: "Instant Heal 50",
      description: "Instantly restores 50 HP",
      type: "HEAL_INSTANT",
      magnitude: 50,
      stackingRule: "NONE",
      status: "ACTIVE",
      tags: ["healing", "instant"],
    },
  });

  const healInstant100 = await prisma.effectDefinition.upsert({
    where: { key: "heal-instant-100" },
    update: {},
    create: {
      key: "heal-instant-100",
      name: "Instant Heal 100",
      description: "Instantly restores 100 HP",
      type: "HEAL_INSTANT",
      magnitude: 100,
      stackingRule: "NONE",
      status: "ACTIVE",
      tags: ["healing", "instant"],
    },
  });

  const healRegen50 = await prisma.effectDefinition.upsert({
    where: { key: "heal-regen-50-30s" },
    update: {},
    create: {
      key: "heal-regen-50-30s",
      name: "Health Regeneration 50/30s",
      description: "Restores 50 HP over 30 seconds",
      type: "HEAL_REGEN",
      magnitude: 50,
      durationSeconds: 30,
      tickSeconds: 5,
      stackingRule: "REFRESH",
      status: "ACTIVE",
      tags: ["healing", "regen"],
    },
  });

  const staminaRestore25 = await prisma.effectDefinition.upsert({
    where: { key: "stamina-restore-25" },
    update: {},
    create: {
      key: "stamina-restore-25",
      name: "Stamina Restore 25",
      description: "Restores 25 SP",
      type: "STAMINA_RESTORE",
      magnitude: 25,
      stackingRule: "NONE",
      status: "ACTIVE",
      tags: ["stamina"],
    },
  });

  // Get herbalist items for recipe inputs (assuming they exist)
  const meadowleafItem = await prisma.item.findUnique({ where: { id: "meadowleaf" } });
  const wildmintItem = await prisma.item.findUnique({ where: { id: "wildmint" } });
  const bitterrootItem = await prisma.item.findUnique({ where: { id: "bitterroot" } });

  // Create a representative set of alchemy recipes (pattern for ~80 total)
  // Level 1-10: Basic Potions
  const minorHealthPotion = await prisma.item.upsert({
    where: { id: "minor-health-potion" },
    update: {},
    create: {
      id: "minor-health-potion",
      key: "minor-health-potion",
      name: "Minor Health Potion",
      description: "A basic healing potion that restores 50 HP instantly.",
      itemType: "CONSUMABLE",
      itemRarity: "COMMON",
      tier: 1,
      value: 20,
      stackable: true,
      maxStack: 999,
      tags: ["potion", "healing", "consumable"],
    },
  });

  // Link effect to item
  if (meadowleafItem && emptyVial && minorHealthPotion) {
    await prisma.itemEffect.upsert({
      where: { id: `${minorHealthPotion.id}-${healInstant50.id}-0` },
      update: {},
      create: {
        id: `${minorHealthPotion.id}-${healInstant50.id}-0`,
        itemId: minorHealthPotion.id,
        effectId: healInstant50.id,
        ordering: 0,
      },
    });

    // Level 1 Recipe: Minor Health Potion
    const minorHealthPotionRecipe = await prisma.recipe.upsert({
      where: { id: "minor-health-potion-recipe" },
      update: {},
      create: {
        id: "minor-health-potion-recipe",
        name: "Minor Health Potion",
        description: "Brew a basic healing potion from common herbs.",
        jobId: alchemistJob.id,
        stationDefinitionId: mortarPestle.id,
        category: "POTION",
        requiredJobLevel: 1,
        difficulty: 1,
        craftTimeSeconds: 5,
        xp: 15,
        successRate: null, // Use calculated
        isDiscoverable: false,
        outputItemId: minorHealthPotion.id,
        outputQty: 1,
        isActive: true,
        allowNonGatherableInputs: false,
        sourceGatherJobKey: "herbalist",
        status: "ACTIVE",
        tags: ["potion", "healing", "tier1"],
      },
    });

    await prisma.recipeInput.upsert({
      where: { id: `${minorHealthPotionRecipe.id}-meadowleaf` },
      update: {},
      create: {
        id: `${minorHealthPotionRecipe.id}-meadowleaf`,
        recipeId: minorHealthPotionRecipe.id,
        itemId: meadowleafItem.id,
        qty: 2,
      },
    });

    await prisma.recipeInput.upsert({
      where: { id: `${minorHealthPotionRecipe.id}-vial` },
      update: {},
      create: {
        id: `${minorHealthPotionRecipe.id}-vial`,
        recipeId: minorHealthPotionRecipe.id,
        itemId: emptyVial.id,
        qty: 1,
      },
    });
  }

  // Helper function to create alchemy recipes programmatically
  const createAlchemyRecipe = async (data: {
    id: string;
    name: string;
    description: string;
    category: string;
    requiredLevel: number;
    stationKey: string;
    difficulty: number;
    craftTime: number;
    xp: number;
    successRate: number | null;
    outputItemId: string;
    outputQty: number;
    inputs: Array<{ itemId: string; qty: number }>;
    tags: string[];
  }) => {
    const station = data.stationKey === "mortar-pestle" ? mortarPestle :
                    data.stationKey === "alchemy-table" ? alchemyTable :
                    data.stationKey === "distillation-apparatus" ? distillationApparatus :
                    data.stationKey === "infusion-vat" ? infusionVat :
                    masterAlchemyLab;

    const recipe = await prisma.recipe.upsert({
      where: { id: data.id },
      update: {},
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        jobId: alchemistJob.id,
        stationDefinitionId: station.id,
        category: data.category,
        requiredJobLevel: data.requiredLevel,
        difficulty: data.difficulty,
        craftTimeSeconds: data.craftTime,
        xp: data.xp,
        successRate: data.successRate,
        isDiscoverable: data.requiredLevel > 50,
        outputItemId: data.outputItemId,
        outputQty: data.outputQty,
        isActive: true,
        allowNonGatherableInputs: false,
        sourceGatherJobKey: "herbalist",
        status: "ACTIVE",
        tags: data.tags,
      },
    });

    // Create inputs
    for (let i = 0; i < data.inputs.length; i++) {
      const input = data.inputs[i];
      await prisma.recipeInput.upsert({
        where: { id: `${recipe.id}-input-${i}` },
        update: {},
        create: {
          id: `${recipe.id}-input-${i}`,
          recipeId: recipe.id,
          itemId: input.itemId,
          qty: input.qty,
        },
      });
    }

    return recipe;
  };

  // Create more effect definitions for different potion tiers
  const healInstant200 = await prisma.effectDefinition.upsert({
    where: { key: "heal-instant-200" },
    update: {},
    create: {
      key: "heal-instant-200",
      name: "Instant Heal 200",
      description: "Instantly restores 200 HP",
      type: "HEAL_INSTANT",
      magnitude: 200,
      stackingRule: "NONE",
      status: "ACTIVE",
      tags: ["healing", "instant"],
    },
  });

  const healInstant500 = await prisma.effectDefinition.upsert({
    where: { key: "heal-instant-500" },
    update: {},
    create: {
      key: "heal-instant-500",
      name: "Instant Heal 500",
      description: "Instantly restores 500 HP",
      type: "HEAL_INSTANT",
      magnitude: 500,
      stackingRule: "NONE",
      status: "ACTIVE",
      tags: ["healing", "instant"],
    },
  });

  // Note: Potion items (healthPotion, greaterHealthPotion, etc.) are created by the template system below
  // Items will be created with effects linked automatically when recipes are generated
  // Keeping only the greaterHealthPotion item creation for legacy recipes if needed

  const greaterHealthPotion = await prisma.item.upsert({
    where: { id: "greater-health-potion" },
    update: {},
    create: {
      id: "greater-health-potion",
      key: "greater-health-potion",
      name: "Greater Health Potion",
      description: "A powerful healing potion that restores 200 HP instantly.",
      itemType: "CONSUMABLE",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 100,
      stackable: true,
      maxStack: 999,
      tags: ["potion", "healing", "consumable"],
    },
  });

  await prisma.itemEffect.upsert({
    where: { id: `${greaterHealthPotion.id}-${healInstant200.id}-0` },
    update: {},
    create: {
      id: `${greaterHealthPotion.id}-${healInstant200.id}-0`,
      itemId: greaterHealthPotion.id,
      effectId: healInstant200.id,
      ordering: 0,
    },
  });

  // Note: Manual recipe creations removed - all recipes now generated from templates below
  // This ensures consistency and avoids duplicates

  // Generate comprehensive recipe set programmatically (~80 recipes total)
  // This creates recipes across all level bands following a consistent pattern
  console.log("📋 Generating comprehensive alchemy recipe set (~80 recipes)...");

  // Helper to get item by id/key
  const getItemByKey = async (key: string) => {
    return await prisma.item.findFirst({
      where: {
        OR: [
          { id: key },
          { key: key },
        ],
      },
    });
  };

  // Comprehensive recipe templates (~80 recipes across L1-100)
  // Format: { level, name, category, station, difficulty, craftTime, xp, successRate, outputKey, effectKey, inputs: [{itemKey, qty}] }
  const recipeTemplates: Array<{
    level: number;
    name: string;
    category: string;
    station: string;
    difficulty: number;
    craftTime: number;
    xp: number;
    successRate: number | null;
    outputKey: string;
    effectKey: string | null;
    inputs: Array<{ itemKey: string; qty: number }>;
  }> = [
    // === LEVEL 1-10 (8 recipes) ===
    { level: 1, name: "Minor Health Potion", category: "POTION", station: "mortar-pestle", difficulty: 1, craftTime: 5, xp: 15, successRate: null, outputKey: "minor-health-potion", effectKey: "heal-instant-50", inputs: [{ itemKey: "meadowleaf", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 2, name: "Basic Healing Salve", category: "SALVE", station: "mortar-pestle", difficulty: 1, craftTime: 6, xp: 16, successRate: null, outputKey: "basic-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "meadowleaf", qty: 1 }, { itemKey: "linen-wrap", qty: 1 }] },
    { level: 3, name: "Health Potion", category: "POTION", station: "mortar-pestle", difficulty: 2, craftTime: 8, xp: 20, successRate: null, outputKey: "health-potion", effectKey: "heal-instant-100", inputs: [{ itemKey: "meadowleaf", qty: 3 }, { itemKey: "wildmint", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 4, name: "Mint Tea Brew", category: "BREW", station: "mortar-pestle", difficulty: 2, craftTime: 7, xp: 18, successRate: null, outputKey: "mint-tea-brew", effectKey: "stamina-restore-25", inputs: [{ itemKey: "wildmint", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 5, name: "Minor Stamina Potion", category: "POTION", station: "mortar-pestle", difficulty: 2, craftTime: 6, xp: 18, successRate: null, outputKey: "minor-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "creek-reed", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 6, name: "Bitterroot Tonic", category: "ELIXIR", station: "mortar-pestle", difficulty: 2, craftTime: 9, xp: 22, successRate: null, outputKey: "bitterroot-tonic", effectKey: null, inputs: [{ itemKey: "bitterroot", qty: 2 }, { itemKey: "basic-solvent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 7, name: "Sunblossom Extract", category: "OIL", station: "mortar-pestle", difficulty: 3, craftTime: 10, xp: 24, successRate: null, outputKey: "sunblossom-extract", effectKey: null, inputs: [{ itemKey: "sunblossom", qty: 3 }, { itemKey: "basic-solvent", qty: 2 }] },
    { level: 8, name: "Greater Health Potion", category: "POTION", station: "mortar-pestle", difficulty: 3, craftTime: 10, xp: 25, successRate: null, outputKey: "greater-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "sunblossom", qty: 2 }, { itemKey: "meadowleaf", qty: 2 }, { itemKey: "basic-solvent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 9, name: "Herbal Powder", category: "POWDER", station: "mortar-pestle", difficulty: 3, craftTime: 9, xp: 23, successRate: null, outputKey: "herbal-powder", effectKey: null, inputs: [{ itemKey: "bitterroot", qty: 3 }, { itemKey: "meadowleaf", qty: 2 }] },
    { level: 10, name: "Basic Utility Potion", category: "UTILITY", station: "mortar-pestle", difficulty: 3, craftTime: 11, xp: 26, successRate: null, outputKey: "basic-utility-potion", effectKey: null, inputs: [{ itemKey: "sunblossom", qty: 2 }, { itemKey: "wildmint", qty: 2 }, { itemKey: "basic-solvent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 11-20 (8 recipes) ===
    { level: 11, name: "Health Regeneration Potion", category: "POTION", station: "alchemy-table", difficulty: 4, craftTime: 12, xp: 30, successRate: null, outputKey: "health-regen-potion", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "duskleaf", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 12, name: "Stamina Potion", category: "POTION", station: "alchemy-table", difficulty: 4, craftTime: 11, xp: 28, successRate: null, outputKey: "stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "thornshade-vine", qty: 2 }, { itemKey: "wildmint", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 13, name: "Mooncap Healing Salve", category: "SALVE", station: "alchemy-table", difficulty: 4, craftTime: 13, xp: 32, successRate: null, outputKey: "mooncap-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "mooncap", qty: 2 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 1 }] },
    { level: 14, name: "Frost Resistance Tonic", category: "ELIXIR", station: "alchemy-table", difficulty: 5, craftTime: 14, xp: 35, successRate: null, outputKey: "frost-resistance-tonic", effectKey: null, inputs: [{ itemKey: "frostbud", qty: 3 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 15, name: "Nightshade Poison Oil", category: "OIL", station: "alchemy-table", difficulty: 5, craftTime: 15, xp: 38, successRate: 0.85, outputKey: "nightshade-poison-oil", effectKey: null, inputs: [{ itemKey: "nightshade", qty: 2 }, { itemKey: "volatile-catalyst", qty: 1 }, { itemKey: "basic-solvent", qty: 1 }] },
    { level: 16, name: "Greater Stamina Potion", category: "POTION", station: "alchemy-table", difficulty: 5, craftTime: 12, xp: 36, successRate: null, outputKey: "greater-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "duskleaf", qty: 3 }, { itemKey: "thornshade-vine", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 17, name: "Antidote Potion", category: "POTION", station: "alchemy-table", difficulty: 5, craftTime: 14, xp: 40, successRate: null, outputKey: "antidote-potion", effectKey: null, inputs: [{ itemKey: "mooncap", qty: 2 }, { itemKey: "bitterroot", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 18, name: "Fire Bomb", category: "BOMB", station: "alchemy-table", difficulty: 6, craftTime: 16, xp: 42, successRate: 0.80, outputKey: "fire-bomb", effectKey: null, inputs: [{ itemKey: "emberbloom", qty: 1 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 19, name: "Advanced Healing Salve", category: "SALVE", station: "alchemy-table", difficulty: 6, craftTime: 17, xp: 44, successRate: null, outputKey: "advanced-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "frostbud", qty: 2 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 2 }] },
    { level: 20, name: "Major Health Potion", category: "POTION", station: "alchemy-table", difficulty: 6, craftTime: 18, xp: 46, successRate: null, outputKey: "major-health-potion-t2", effectKey: "heal-instant-200", inputs: [{ itemKey: "emberbloom", qty: 2 }, { itemKey: "duskleaf", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 21-30 (8 recipes) - Continue pattern ===
    { level: 21, name: "Major Health Potion", category: "POTION", station: "alchemy-table", difficulty: 6, craftTime: 15, xp: 45, successRate: null, outputKey: "major-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "emberbloom", qty: 2 }, { itemKey: "duskleaf", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 22, name: "Silverthorn Coating Oil", category: "OIL", station: "alchemy-table", difficulty: 6, craftTime: 16, xp: 48, successRate: null, outputKey: "silverthorn-coating-oil", effectKey: null, inputs: [{ itemKey: "silverthorn", qty: 2 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 23, name: "Stormpetal Lightning Bomb", category: "BOMB", station: "alchemy-table", difficulty: 7, craftTime: 18, xp: 50, successRate: 0.75, outputKey: "stormpetal-lightning-bomb", effectKey: null, inputs: [{ itemKey: "stormpetal", qty: 1 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 24, name: "Bloodmoss Healing Elixir", category: "ELIXIR", station: "alchemy-table", difficulty: 7, craftTime: 19, xp: 52, successRate: null, outputKey: "bloodmoss-healing-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "bloodmoss", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 25, name: "Deepwood Salve", category: "SALVE", station: "distillation-apparatus", difficulty: 7, craftTime: 20, xp: 55, successRate: null, outputKey: "deepwood-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 1 }] },
    { level: 26, name: "Superior Health Potion", category: "POTION", station: "distillation-apparatus", difficulty: 8, craftTime: 18, xp: 58, successRate: null, outputKey: "superior-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "silverthorn", qty: 2 }, { itemKey: "bloodmoss", qty: 1 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 27, name: "Paralysis Oil", category: "OIL", station: "distillation-apparatus", difficulty: 8, craftTime: 20, xp: 60, successRate: 0.75, outputKey: "paralysis-oil", effectKey: null, inputs: [{ itemKey: "nightshade", qty: 3 }, { itemKey: "volatile-catalyst", qty: 1 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 28, name: "Frost Bomb", category: "BOMB", station: "distillation-apparatus", difficulty: 8, craftTime: 22, xp: 62, successRate: 0.78, outputKey: "frost-bomb", effectKey: null, inputs: [{ itemKey: "frostbud", qty: 2 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    // === LEVEL 21-30 (8 recipes) ===
    { level: 21, name: "Major Health Potion", category: "POTION", station: "alchemy-table", difficulty: 6, craftTime: 15, xp: 45, successRate: null, outputKey: "major-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "emberbloom", qty: 2 }, { itemKey: "duskleaf", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 22, name: "Silverthorn Coating Oil", category: "OIL", station: "alchemy-table", difficulty: 6, craftTime: 16, xp: 48, successRate: null, outputKey: "silverthorn-coating-oil", effectKey: null, inputs: [{ itemKey: "silverthorn", qty: 2 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 23, name: "Stormpetal Lightning Bomb", category: "BOMB", station: "alchemy-table", difficulty: 7, craftTime: 18, xp: 50, successRate: 0.75, outputKey: "stormpetal-lightning-bomb", effectKey: null, inputs: [{ itemKey: "stormpetal", qty: 1 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 24, name: "Bloodmoss Healing Elixir", category: "ELIXIR", station: "alchemy-table", difficulty: 7, craftTime: 19, xp: 52, successRate: null, outputKey: "bloodmoss-healing-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "bloodmoss", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 25, name: "Deepwood Salve", category: "SALVE", station: "distillation-apparatus", difficulty: 7, craftTime: 20, xp: 55, successRate: null, outputKey: "deepwood-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 1 }] },
    { level: 26, name: "Superior Health Potion", category: "POTION", station: "distillation-apparatus", difficulty: 8, craftTime: 18, xp: 58, successRate: null, outputKey: "superior-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "silverthorn", qty: 2 }, { itemKey: "bloodmoss", qty: 1 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 27, name: "Paralysis Oil", category: "OIL", station: "distillation-apparatus", difficulty: 8, craftTime: 20, xp: 60, successRate: 0.75, outputKey: "paralysis-oil", effectKey: null, inputs: [{ itemKey: "nightshade", qty: 3 }, { itemKey: "volatile-catalyst", qty: 1 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 28, name: "Frost Bomb", category: "BOMB", station: "distillation-apparatus", difficulty: 8, craftTime: 22, xp: 62, successRate: 0.78, outputKey: "frost-bomb", effectKey: null, inputs: [{ itemKey: "frostbud", qty: 2 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 29, name: "Advanced Antidote", category: "POTION", station: "distillation-apparatus", difficulty: 8, craftTime: 20, xp: 64, successRate: null, outputKey: "advanced-antidote", effectKey: null, inputs: [{ itemKey: "bloodmoss", qty: 2 }, { itemKey: "mooncap", qty: 2 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 30, name: "Supreme Health Potion", category: "POTION", station: "distillation-apparatus", difficulty: 9, craftTime: 24, xp: 68, successRate: null, outputKey: "supreme-health-potion", effectKey: "heal-instant-200", inputs: [{ itemKey: "bloodmoss", qty: 3 }, { itemKey: "silverthorn", qty: 2 }, { itemKey: "basic-solvent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 31-40 (8 recipes) ===
    { level: 31, name: "Major Stamina Potion", category: "POTION", station: "distillation-apparatus", difficulty: 9, craftTime: 18, xp: 70, successRate: null, outputKey: "major-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "thornshade-vine", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 32, name: "Corrosion Oil", category: "OIL", station: "distillation-apparatus", difficulty: 9, craftTime: 22, xp: 72, successRate: 0.72, outputKey: "corrosion-oil", effectKey: null, inputs: [{ itemKey: "nightshade", qty: 3 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "basic-solvent", qty: 2 }] },
    { level: 33, name: "Perfect Antidote", category: "POTION", station: "distillation-apparatus", difficulty: 9, craftTime: 25, xp: 75, successRate: null, outputKey: "perfect-antidote", effectKey: null, inputs: [{ itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "bloodmoss", qty: 2 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 34, name: "Lightning Bomb", category: "BOMB", station: "distillation-apparatus", difficulty: 10, craftTime: 26, xp: 78, successRate: 0.75, outputKey: "lightning-bomb", effectKey: null, inputs: [{ itemKey: "stormpetal", qty: 2 }, { itemKey: "volatile-catalyst", qty: 3 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 35, name: "Master Healing Salve", category: "SALVE", station: "distillation-apparatus", difficulty: 9, craftTime: 23, xp: 74, successRate: null, outputKey: "master-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "bloodmoss", qty: 3 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 2 }] },
    { level: 36, name: "Fire Resistance Elixir", category: "ELIXIR", station: "distillation-apparatus", difficulty: 9, craftTime: 24, xp: 76, successRate: null, outputKey: "fire-resistance-elixir", effectKey: null, inputs: [{ itemKey: "emberbloom", qty: 3 }, { itemKey: "basic-solvent", qty: 3 }, { itemKey: "stabilizing-salt", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 37, name: "Poison Coating Oil", category: "OIL", station: "distillation-apparatus", difficulty: 10, craftTime: 25, xp: 80, successRate: 0.70, outputKey: "poison-coating-oil", effectKey: null, inputs: [{ itemKey: "nightshade", qty: 4 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 38, name: "Void Bomb", category: "BOMB", station: "distillation-apparatus", difficulty: 10, craftTime: 28, xp: 82, successRate: 0.73, outputKey: "void-bomb", effectKey: null, inputs: [{ itemKey: "wraithorchid", qty: 1 }, { itemKey: "volatile-catalyst", qty: 3 }, { itemKey: "stabilizing-salt", qty: 2 }] },
    { level: 39, name: "Advanced Regeneration Elixir", category: "ELIXIR", station: "distillation-apparatus", difficulty: 10, craftTime: 27, xp: 84, successRate: null, outputKey: "advanced-regen-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "silverthorn", qty: 3 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 40, name: "Elite Health Potion", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 28, xp: 85, successRate: null, outputKey: "elite-health-potion", effectKey: "heal-instant-500", inputs: [{ itemKey: "wraithorchid", qty: 2 }, { itemKey: "bloodmoss", qty: 3 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 41-50 (8 recipes) ===
    { level: 41, name: "Ancient Healing Elixir", category: "ELIXIR", station: "infusion-vat", difficulty: 10, craftTime: 30, xp: 88, successRate: null, outputKey: "ancient-healing-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "ancient-ginseng", qty: 2 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 42, name: "Soulburn Oil", category: "OIL", station: "infusion-vat", difficulty: 10, craftTime: 32, xp: 90, successRate: 0.68, outputKey: "soulburn-oil", effectKey: null, inputs: [{ itemKey: "wraithorchid", qty: 3 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 43, name: "Panacea Potion", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 30, xp: 92, successRate: null, outputKey: "panacea-potion", effectKey: null, inputs: [{ itemKey: "ancient-ginseng", qty: 3 }, { itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 44, name: "Cataclysm Bomb", category: "BOMB", station: "infusion-vat", difficulty: 10, craftTime: 35, xp: 95, successRate: 0.65, outputKey: "cataclysm-bomb", effectKey: null, inputs: [{ itemKey: "spiritvine", qty: 2 }, { itemKey: "volatile-catalyst", qty: 4 }, { itemKey: "stabilizing-salt", qty: 2 }] },
    { level: 45, name: "Venom Coating Oil", category: "OIL", station: "infusion-vat", difficulty: 10, craftTime: 33, xp: 93, successRate: 0.70, outputKey: "venom-coating-oil", effectKey: null, inputs: [{ itemKey: "venomflower", qty: 3 }, { itemKey: "volatile-catalyst", qty: 2 }, { itemKey: "stabilizing-salt", qty: 1 }] },
    { level: 46, name: "Tempest Elixir", category: "ELIXIR", station: "infusion-vat", difficulty: 10, craftTime: 34, xp: 96, successRate: null, outputKey: "tempest-elixir", effectKey: null, inputs: [{ itemKey: "tempestbloom", qty: 3 }, { itemKey: "basic-solvent", qty: 3 }, { itemKey: "binding-agent", qty: 1 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 47, name: "Master Healing Potion", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 32, xp: 98, successRate: null, outputKey: "master-healing-potion", effectKey: "heal-instant-500", inputs: [{ itemKey: "spiritvine", qty: 2 }, { itemKey: "wraithorchid", qty: 2 }, { itemKey: "basic-solvent", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 48, name: "Advanced Stamina Elixir", category: "ELIXIR", station: "infusion-vat", difficulty: 10, craftTime: 31, xp: 99, successRate: null, outputKey: "advanced-stamina-elixir", effectKey: "stamina-restore-25", inputs: [{ itemKey: "spiritvine", qty: 3 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 49, name: "Superior Coating Oil", category: "OIL", station: "infusion-vat", difficulty: 10, craftTime: 36, xp: 101, successRate: 0.67, outputKey: "superior-coating-oil", effectKey: null, inputs: [{ itemKey: "wraithorchid", qty: 2 }, { itemKey: "volatile-catalyst", qty: 3 }, { itemKey: "stabilizing-salt", qty: 2 }] },
    { level: 50, name: "Perfect Antidote Advanced", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 38, xp: 104, successRate: null, outputKey: "perfect-antidote-advanced", effectKey: null, inputs: [{ itemKey: "ancient-ginseng", qty: 3 }, { itemKey: "wraithorchid", qty: 2 }, { itemKey: "binding-agent", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 51-60 (8 recipes) ===
    { level: 51, name: "Supreme Stamina Potion", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 30, xp: 100, successRate: null, outputKey: "supreme-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "spiritvine", qty: 3 }, { itemKey: "deepwood-mycelium", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 52, name: "Perfect Panacea", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 36, xp: 105, successRate: null, outputKey: "perfect-panacea", effectKey: null, inputs: [{ itemKey: "ancient-ginseng", qty: 4 }, { itemKey: "wraithorchid", qty: 2 }, { itemKey: "binding-agent", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 53, name: "Legendary Healing Salve", category: "SALVE", station: "infusion-vat", difficulty: 10, craftTime: 35, xp: 108, successRate: null, outputKey: "legendary-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "tempestbloom", qty: 3 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 3 }] },
    { level: 54, name: "Advanced Resistance Elixir", category: "ELIXIR", station: "infusion-vat", difficulty: 10, craftTime: 38, xp: 110, successRate: null, outputKey: "advanced-resistance-elixir", effectKey: null, inputs: [{ itemKey: "tempestbloom", qty: 3 }, { itemKey: "frostbud", qty: 3 }, { itemKey: "basic-solvent", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 55, name: "Corrosive Bomb", category: "BOMB", station: "infusion-vat", difficulty: 10, craftTime: 40, xp: 112, successRate: 0.65, outputKey: "corrosive-bomb", effectKey: null, inputs: [{ itemKey: "venomflower", qty: 2 }, { itemKey: "volatile-catalyst", qty: 4 }, { itemKey: "stabilizing-salt", qty: 2 }] },
    { level: 56, name: "Elite Stamina Potion", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 32, xp: 115, successRate: null, outputKey: "elite-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "starlotus", qty: 1 }, { itemKey: "spiritvine", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 57, name: "Supreme Panacea", category: "POTION", station: "infusion-vat", difficulty: 10, craftTime: 42, xp: 118, successRate: null, outputKey: "supreme-panacea", effectKey: null, inputs: [{ itemKey: "umbral-truffle", qty: 1 }, { itemKey: "ancient-ginseng", qty: 3 }, { itemKey: "binding-agent", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 58, name: "Master Coating Oil", category: "OIL", station: "infusion-vat", difficulty: 10, craftTime: 40, xp: 120, successRate: 0.68, outputKey: "master-coating-oil", effectKey: null, inputs: [{ itemKey: "celestial-saffron", qty: 2 }, { itemKey: "volatile-catalyst", qty: 3 }, { itemKey: "stabilizing-salt", qty: 2 }] },
    // === LEVEL 61-70 (8 recipes) ===
    { level: 61, name: "Ultimate Health Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 45, xp: 125, successRate: null, outputKey: "ultimate-health-potion", effectKey: "heal-instant-500", inputs: [{ itemKey: "starlotus", qty: 2 }, { itemKey: "tempestbloom", qty: 3 }, { itemKey: "basic-solvent", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 62, name: "Umbral Bomb", category: "BOMB", station: "master-alchemy-lab", difficulty: 10, craftTime: 48, xp: 128, successRate: 0.60, outputKey: "umbral-bomb", effectKey: null, inputs: [{ itemKey: "umbral-truffle", qty: 2 }, { itemKey: "volatile-catalyst", qty: 5 }, { itemKey: "stabilizing-salt", qty: 3 }] },
    { level: 63, name: "Celestial Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 50, xp: 130, successRate: null, outputKey: "celestial-elixir", effectKey: null, inputs: [{ itemKey: "celestial-saffron", qty: 3 }, { itemKey: "basic-solvent", qty: 5 }, { itemKey: "binding-agent", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 64, name: "Perfect Healing Salve", category: "SALVE", station: "master-alchemy-lab", difficulty: 10, craftTime: 46, xp: 132, successRate: null, outputKey: "perfect-healing-salve", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "phoenixfern", qty: 2 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 4 }] },
    { level: 65, name: "Phoenix Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 52, xp: 135, successRate: null, outputKey: "phoenix-potion", effectKey: "heal-instant-500", inputs: [{ itemKey: "phoenixfern", qty: 3 }, { itemKey: "starlotus", qty: 1 }, { itemKey: "binding-agent", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 66, name: "Worldroot Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 55, xp: 138, successRate: null, outputKey: "worldroot-elixir", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "celestial-saffron", qty: 2 }, { itemKey: "basic-solvent", qty: 5 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 67, name: "Supreme Coating Oil", category: "OIL", station: "master-alchemy-lab", difficulty: 10, craftTime: 50, xp: 140, successRate: 0.62, outputKey: "supreme-coating-oil", effectKey: null, inputs: [{ itemKey: "phoenixfern", qty: 2 }, { itemKey: "volatile-catalyst", qty: 4 }, { itemKey: "stabilizing-salt", qty: 3 }] },
    { level: 68, name: "Perfect Antidote Elite", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 48, xp: 142, successRate: null, outputKey: "perfect-antidote-elite", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "umbral-truffle", qty: 2 }, { itemKey: "binding-agent", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    // === LEVEL 71-80 (8 recipes) ===
    { level: 71, name: "Legendary Health Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 55, xp: 145, successRate: null, outputKey: "legendary-health-potion", effectKey: "heal-instant-500", inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "phoenixfern", qty: 3 }, { itemKey: "basic-solvent", qty: 5 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 72, name: "Master Bomb", category: "BOMB", station: "master-alchemy-lab", difficulty: 10, craftTime: 60, xp: 148, successRate: 0.58, outputKey: "master-bomb", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "volatile-catalyst", qty: 6 }, { itemKey: "stabilizing-salt", qty: 4 }] },
    { level: 73, name: "Elite Regeneration Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 58, xp: 150, successRate: null, outputKey: "elite-regen-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "celestial-saffron", qty: 4 }, { itemKey: "binding-agent", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 74, name: "Ultimate Stamina Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 52, xp: 152, successRate: null, outputKey: "ultimate-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "umbral-truffle", qty: 2 }, { itemKey: "starlotus", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 75, name: "Perfect Panacea Supreme", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 62, xp: 155, successRate: null, outputKey: "perfect-panacea-supreme", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "ancient-ginseng", qty: 4 }, { itemKey: "binding-agent", qty: 5 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 76, name: "Elite Coating Oil", category: "OIL", station: "master-alchemy-lab", difficulty: 10, craftTime: 60, xp: 158, successRate: 0.60, outputKey: "elite-coating-oil", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "volatile-catalyst", qty: 5 }, { itemKey: "stabilizing-salt", qty: 4 }] },
    { level: 77, name: "Supreme Healing Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 65, xp: 160, successRate: null, outputKey: "supreme-healing-elixir", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "phoenixfern", qty: 4 }, { itemKey: "celestial-saffron", qty: 3 }, { itemKey: "binding-agent", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 78, name: "Legendary Bomb", category: "BOMB", station: "master-alchemy-lab", difficulty: 10, craftTime: 68, xp: 162, successRate: 0.55, outputKey: "legendary-bomb", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "volatile-catalyst", qty: 7 }, { itemKey: "stabilizing-salt", qty: 5 }] },
    // === LEVEL 81-90 (8 recipes) ===
    { level: 81, name: "Supreme Health Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 70, xp: 165, successRate: null, outputKey: "supreme-health-potion-elite", effectKey: "heal-instant-500", inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "phoenixfern", qty: 4 }, { itemKey: "basic-solvent", qty: 6 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 82, name: "Perfect Utility Brew", category: "BREW", station: "master-alchemy-lab", difficulty: 10, craftTime: 65, xp: 168, successRate: null, outputKey: "perfect-utility-brew", effectKey: null, inputs: [{ itemKey: "celestial-saffron", qty: 5 }, { itemKey: "starlotus", qty: 2 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 83, name: "Elite Resistance Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 72, xp: 170, successRate: null, outputKey: "elite-resistance-elixir", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "tempestbloom", qty: 4 }, { itemKey: "basic-solvent", qty: 6 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 84, name: "Ultimate Coating Oil", category: "OIL", station: "master-alchemy-lab", difficulty: 10, craftTime: 68, xp: 172, successRate: 0.58, outputKey: "ultimate-coating-oil", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "volatile-catalyst", qty: 6 }, { itemKey: "stabilizing-salt", qty: 5 }] },
    { level: 85, name: "Perfect Healing Salve Elite", category: "SALVE", station: "master-alchemy-lab", difficulty: 10, craftTime: 70, xp: 175, successRate: null, outputKey: "perfect-healing-salve-elite", effectKey: "heal-regen-50-30s", inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "phoenixfern", qty: 3 }, { itemKey: "linen-wrap", qty: 1 }, { itemKey: "binding-agent", qty: 5 }] },
    { level: 86, name: "Master Stamina Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 62, xp: 178, successRate: null, outputKey: "master-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "umbral-truffle", qty: 3 }, { itemKey: "starlotus", qty: 3 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 87, name: "Supreme Panacea Elite", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 75, xp: 180, successRate: null, outputKey: "supreme-panacea-elite", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 3 }, { itemKey: "ancient-ginseng", qty: 5 }, { itemKey: "binding-agent", qty: 6 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 88, name: "Elite Bomb", category: "BOMB", station: "master-alchemy-lab", difficulty: 10, craftTime: 78, xp: 182, successRate: 0.52, outputKey: "elite-bomb", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "volatile-catalyst", qty: 8 }, { itemKey: "stabilizing-salt", qty: 6 }] },
    // === LEVEL 91-100 (8 recipes) ===
    { level: 91, name: "Ultimate Health Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 80, xp: 185, successRate: null, outputKey: "ultimate-health-potion-elite", effectKey: "heal-instant-500", inputs: [{ itemKey: "worldroot", qty: 3 }, { itemKey: "phoenixfern", qty: 5 }, { itemKey: "basic-solvent", qty: 7 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 92, name: "Perfect Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 82, xp: 188, successRate: null, outputKey: "perfect-elixir", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "celestial-saffron", qty: 5 }, { itemKey: "starlotus", qty: 3 }, { itemKey: "basic-solvent", qty: 7 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 93, name: "Legendary Coating Oil", category: "OIL", station: "master-alchemy-lab", difficulty: 10, craftTime: 80, xp: 190, successRate: 0.55, outputKey: "legendary-coating-oil", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "volatile-catalyst", qty: 9 }, { itemKey: "stabilizing-salt", qty: 7 }] },
    { level: 94, name: "Supreme Healing Potion Elite", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 85, xp: 192, successRate: null, outputKey: "supreme-healing-potion-elite", effectKey: "heal-instant-500", inputs: [{ itemKey: "worldroot", qty: 3 }, { itemKey: "umbral-truffle", qty: 4 }, { itemKey: "basic-solvent", qty: 8 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 95, name: "Perfect Utility Potion", category: "UTILITY", station: "master-alchemy-lab", difficulty: 10, craftTime: 75, xp: 195, successRate: null, outputKey: "perfect-utility-potion", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 1 }, { itemKey: "celestial-saffron", qty: 4 }, { itemKey: "binding-agent", qty: 6 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 96, name: "Ultimate Bomb", category: "BOMB", station: "master-alchemy-lab", difficulty: 10, craftTime: 90, xp: 198, successRate: 0.50, outputKey: "ultimate-bomb", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 3 }, { itemKey: "volatile-catalyst", qty: 10 }, { itemKey: "stabilizing-salt", qty: 8 }] },
    { level: 97, name: "Perfect Panacea Ultimate", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 88, xp: 200, successRate: null, outputKey: "perfect-panacea-ultimate", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 4 }, { itemKey: "ancient-ginseng", qty: 6 }, { itemKey: "binding-agent", qty: 7 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 98, name: "Supreme Elixir", category: "ELIXIR", station: "master-alchemy-lab", difficulty: 10, craftTime: 92, xp: 202, successRate: null, outputKey: "supreme-elixir", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 3 }, { itemKey: "phoenixfern", qty: 5 }, { itemKey: "celestial-saffron", qty: 4 }, { itemKey: "basic-solvent", qty: 8 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 99, name: "Legendary Stamina Potion", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 85, xp: 205, successRate: null, outputKey: "legendary-stamina-potion", effectKey: "stamina-restore-25", inputs: [{ itemKey: "worldroot", qty: 2 }, { itemKey: "starlotus", qty: 5 }, { itemKey: "umbral-truffle", qty: 4 }, { itemKey: "empty-glass-vial", qty: 1 }] },
    { level: 100, name: "Ultimate Panacea", category: "POTION", station: "master-alchemy-lab", difficulty: 10, craftTime: 100, xp: 210, successRate: null, outputKey: "ultimate-panacea", effectKey: null, inputs: [{ itemKey: "worldroot", qty: 5 }, { itemKey: "phoenixfern", qty: 6 }, { itemKey: "ancient-ginseng", qty: 7 }, { itemKey: "binding-agent", qty: 8 }, { itemKey: "empty-glass-vial", qty: 1 }] },
  ];

  // Process recipe templates and create recipes programmatically
  let recipesGenerated = 0;
  const skippedRecipes: string[] = [];

  for (const template of recipeTemplates) {
    try {
      // Get station
      const stationMap: Record<string, typeof mortarPestle> = {
        "mortar-pestle": mortarPestle,
        "alchemy-table": alchemyTable,
        "distillation-apparatus": distillationApparatus,
        "infusion-vat": infusionVat,
        "master-alchemy-lab": masterAlchemyLab,
      };
      const station = stationMap[template.station];
      if (!station) {
        skippedRecipes.push(`${template.name} (invalid station: ${template.station})`);
        continue;
      }

      // Get or create output item
      let outputItem = await getItemByKey(template.outputKey);
      if (!outputItem) {
        const tier = Math.min(5, Math.floor((template.level - 1) / 20) + 1);
        const rarity = tier === 1 ? "COMMON" : tier === 2 ? "UNCOMMON" : tier === 3 ? "RARE" : tier === 4 ? "EPIC" : "LEGENDARY";
        const value = Math.max(10, template.level * tier * 5);

        outputItem = await prisma.item.upsert({
          where: { id: template.outputKey },
          update: {},
          create: {
            id: template.outputKey,
            key: template.outputKey,
            name: template.name,
            description: `A ${template.category.toLowerCase()} created through alchemy (Level ${template.level}).`,
            itemType: "CONSUMABLE",
            itemRarity: rarity,
            tier,
            value,
            stackable: true,
            maxStack: 999,
            tags: [template.category.toLowerCase(), "consumable", `tier${tier}`, `level${template.level}`],
          },
        });

        // Link effect if provided
        if (template.effectKey) {
          const effect = await prisma.effectDefinition.findUnique({ where: { key: template.effectKey } });
          if (effect) {
            await prisma.itemEffect.upsert({
              where: { id: `${outputItem.id}-${effect.id}-0` },
              update: {},
              create: {
                id: `${outputItem.id}-${effect.id}-0`,
                itemId: outputItem.id,
                effectId: effect.id,
                ordering: 0,
              },
            });
          }
        }
      }

      // Resolve input items
      const resolvedInputs: Array<{ itemId: string; qty: number }> = [];
      for (const input of template.inputs) {
        const item = await getItemByKey(input.itemKey);
        if (item) {
          resolvedInputs.push({ itemId: item.id, qty: input.qty });
        } else {
          skippedRecipes.push(`${template.name} (missing input: ${input.itemKey})`);
          break; // Skip this recipe if input is missing
        }
      }

      // Create recipe if all inputs resolved
      if (resolvedInputs.length === template.inputs.length && outputItem) {
        await createAlchemyRecipe({
          id: `${template.outputKey}-recipe`,
          name: template.name,
          description: `A ${template.category.toLowerCase()} recipe requiring level ${template.level}.`,
          category: template.category,
          requiredLevel: template.level,
          stationKey: template.station,
          difficulty: template.difficulty,
          craftTime: template.craftTime,
          xp: template.xp,
          successRate: template.successRate,
          outputItemId: outputItem.id,
          outputQty: 1,
          inputs: resolvedInputs,
          tags: [template.category.toLowerCase(), `level${template.level}`, `tier${Math.min(5, Math.floor((template.level - 1) / 20) + 1)}`],
        });
        recipesGenerated++;
      }
    } catch (error: any) {
      console.error(`❌ Error creating recipe "${template.name}":`, error?.message || error);
      skippedRecipes.push(`${template.name} (error: ${error?.message || "unknown"})`);
    }
  }

  if (skippedRecipes.length > 0) {
    console.warn(`⚠️  Skipped ${skippedRecipes.length} recipes due to missing items/errors:`, skippedRecipes.slice(0, 10));
  }

  console.log(`✅ Alchemy system seed data created`);
  console.log(`   - 5 Alchemy Stations (Mortar & Pestle → Master Lab)`);
  console.log(`   - 6 Reagent Items (Vials, Solvents, Catalysts, etc.)`);
  console.log(`   - 5 Effect Definitions (Healing, Stamina, Regen)`);
  console.log(`   - ${recipesGenerated} Recipes created from ${recipeTemplates.length} templates`);
  console.log(`   - Recipes span levels 1-100 across all categories (POTION, BREW, OIL, POWDER, SALVE, ELIXIR, BOMB, UTILITY)`);

  // Create gathering nodes
  console.log("Creating gathering nodes...");

  // Mining nodes - Tier 1 (Levels 1-20)
  const minerNodes = [
    // TIER 1
    { key: "loose-stone-outcrop", name: "Loose Stone Outcrop", req: 1, time: 25, xp: 12, danger: 0, tier: 1, item: stone, minQty: 1, maxQty: 2 },
    { key: "copper-vein", name: "Copper Vein", req: 5, time: 30, xp: 15, danger: 0, tier: 1, item: copperOre, minQty: 1, maxQty: 3 },
    { key: "tin-seam", name: "Tin Seam", req: 10, time: 35, xp: 18, danger: 0, tier: 1, item: tinOre, minQty: 1, maxQty: 4 },
    { key: "iron-deposit", name: "Iron Deposit", req: 15, time: 40, xp: 22, danger: 1, tier: 1, item: ironOre, minQty: 1, maxQty: 4 },
    { key: "coal-pocket", name: "Coal Pocket", req: 20, time: 45, xp: 25, danger: 1, tier: 1, item: coal, minQty: 2, maxQty: 4 },
    // TIER 2
    { key: "silver-thread-vein", name: "Silver Thread Vein", req: 25, time: 75, xp: 35, danger: 1, tier: 2, item: silverOre, minQty: 1, maxQty: 4 },
    { key: "gold-flake-seam", name: "Gold Flake Seam", req: 30, time: 90, xp: 42, danger: 1, tier: 2, item: goldOre, minQty: 1, maxQty: 5 },
    { key: "quartz-cluster", name: "Quartz Cluster", req: 35, time: 105, xp: 50, danger: 2, tier: 2, item: quartz, minQty: 2, maxQty: 5 },
    { key: "platinum-speck-vein", name: "Platinum Speck Vein", req: 38, time: 115, xp: 55, danger: 2, tier: 2, item: platinumOre, minQty: 1, maxQty: 4 },
    { key: "sulfur-shelf", name: "Sulfur Shelf", req: 40, time: 120, xp: 60, danger: 2, tier: 2, item: sulfur, minQty: 2, maxQty: 5 },
    // TIER 3
    { key: "dense-iron-lode", name: "Dense Iron Lode", req: 45, time: 150, xp: 80, danger: 2, tier: 3, item: denseIronOre, minQty: 1, maxQty: 5 },
    { key: "deep-silver-lode", name: "Deep Silver Lode", req: 50, time: 180, xp: 95, danger: 3, tier: 3, item: deepSilverOre, minQty: 2, maxQty: 6 },
    { key: "crystal-geode", name: "Crystal Geode", req: 55, time: 210, xp: 110, danger: 3, tier: 3, item: geodeCrystal, minQty: 2, maxQty: 7 },
    { key: "volcanic-obsidian-seam", name: "Volcanic Obsidian Seam", req: 58, time: 225, xp: 115, danger: 3, tier: 3, item: obsidian, minQty: 1, maxQty: 6 },
    { key: "blackstone-ore-vein", name: "Blackstone Ore Vein", req: 60, time: 240, xp: 120, danger: 3, tier: 3, item: blackstoneOre, minQty: 3, maxQty: 7 },
    // TIER 4
    { key: "mithril-vein", name: "Mithril Vein", req: 65, time: 300, xp: 150, danger: 3, tier: 4, item: mithrilOre, minQty: 1, maxQty: 3 },
    { key: "adamantite-seam", name: "Adamantite Seam", req: 70, time: 360, xp: 175, danger: 4, tier: 4, item: adamantiteOre, minQty: 1, maxQty: 3 },
    { key: "runestone-cluster", name: "Runestone Cluster", req: 75, time: 420, xp: 200, danger: 4, tier: 4, item: runestone, minQty: 2, maxQty: 4 },
    { key: "blood-iron-lode", name: "Blood-Iron Lode", req: 78, time: 480, xp: 220, danger: 4, tier: 4, item: bloodIronOre, minQty: 1, maxQty: 3 },
    { key: "tempest-crystal-shelf", name: "Tempest Crystal Shelf", req: 80, time: 540, xp: 240, danger: 4, tier: 4, item: tempestCrystal, minQty: 2, maxQty: 4 },
    // TIER 5
    { key: "void-quartz-rift", name: "Void Quartz Rift", req: 85, time: 900, xp: 360, danger: 4, tier: 5, item: voidQuartz, minQty: 1, maxQty: 2 },
    { key: "star-metal-fragment-bed", name: "Star-Metal Fragment Bed", req: 88, time: 1050, xp: 420, danger: 4, tier: 5, item: starMetal, minQty: 1, maxQty: 2 },
    { key: "celestial-mithril-lode", name: "Celestial Mithril Lode", req: 90, time: 1200, xp: 480, danger: 5, tier: 5, item: celestialMithril, minQty: 1, maxQty: 2 },
    { key: "abyssal-adamantite-heart", name: "Abyssal Adamantite Heart", req: 95, time: 1350, xp: 540, danger: 5, tier: 5, item: abyssalAdamantite, minQty: 1, maxQty: 1 },
    { key: "worldcore-ore-monolith", name: "Worldcore Ore Monolith", req: 100, time: 1500, xp: 600, danger: 5, tier: 5, item: worldcoreOre, minQty: 1, maxQty: 2 },
  ];

  for (const nodeData of minerNodes) {
    const node = await prisma.gatheringNode.upsert({
      where: { key: nodeData.key },
      update: {
        name: nodeData.name,
        tier: nodeData.tier,
        requiredJobLevel: nodeData.req,
        gatherTimeSeconds: nodeData.time,
        xpReward: nodeData.xp,
        dangerTier: nodeData.danger,
      },
      create: {
        key: nodeData.key,
        name: nodeData.name,
        description: `A mining node requiring level ${nodeData.req}.`,
        jobId: minerJob.id,
        tier: nodeData.tier,
        requiredJobLevel: nodeData.req,
        gatherTimeSeconds: nodeData.time,
        xpReward: nodeData.xp,
        dangerTier: nodeData.danger,
      },
    });

    await prisma.nodeYield.upsert({
      where: { id: `${node.id}-${nodeData.item.id}` },
      update: {
        minQty: nodeData.minQty,
        maxQty: nodeData.maxQty,
      },
      create: {
        id: `${node.id}-${nodeData.item.id}`,
        nodeId: node.id,
        itemId: nodeData.item.id,
        minQty: nodeData.minQty,
        maxQty: nodeData.maxQty,
        weight: 100,
      },
    });
  }

  // Fishing items for Fisher nodes
  console.log("Creating fishing items...");
  
  const minnow = await prisma.item.upsert({
    where: { id: "minnow" },
    update: {},
    create: {
      id: "minnow",
      key: "minnow",
      name: "Minnow",
      description: "A tiny freshwater fish.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 3,
      stackable: true,
      maxStack: 99,
    },
  });

  const perch = await prisma.item.upsert({
    where: { id: "perch" },
    update: {},
    create: {
      id: "perch",
      key: "perch",
      name: "Perch",
      description: "A common river fish.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 5,
      stackable: true,
      maxStack: 99,
    },
  });

  const carp = await prisma.item.upsert({
    where: { id: "carp" },
    update: {},
    create: {
      id: "carp",
      key: "carp",
      name: "Carp",
      description: "A hardy pond fish.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 6,
      stackable: true,
      maxStack: 99,
    },
  });

  const sardine = await prisma.item.upsert({
    where: { id: "sardine" },
    update: {},
    create: {
      id: "sardine",
      key: "sardine",
      name: "Sardine",
      description: "A small coastal fish.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 7,
      stackable: true,
      maxStack: 99,
    },
  });

  const tidepoolShellfish = await prisma.item.upsert({
    where: { id: "tidepool-shellfish" },
    update: {},
    create: {
      id: "tidepool-shellfish",
      key: "tidepool-shellfish",
      name: "Tidepool Shellfish",
      description: "Shellfish from rocky tidepools.",
      itemType: "MATERIAL",
      itemRarity: "COMMON",
      tier: 1,
      value: 8,
      stackable: true,
      maxStack: 99,
    },
  });

  const catfish = await prisma.item.upsert({
    where: { id: "catfish" },
    update: {},
    create: {
      id: "catfish",
      key: "catfish",
      name: "Catfish",
      description: "A deep river bottom-feeder.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 12,
      stackable: true,
      maxStack: 99,
    },
  });

  const mackerel = await prisma.item.upsert({
    where: { id: "mackerel" },
    update: {},
    create: {
      id: "mackerel",
      key: "mackerel",
      name: "Mackerel",
      description: "A fast-swimming bay fish.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 15,
      stackable: true,
      maxStack: 99,
    },
  });

  const kelpShellfish = await prisma.item.upsert({
    where: { id: "kelp-shellfish" },
    update: {},
    create: {
      id: "kelp-shellfish",
      key: "kelp-shellfish",
      name: "Kelp Shellfish",
      description: "Shellfish harvested from kelp beds.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 18,
      stackable: true,
      maxStack: 99,
    },
  });

  const tuna = await prisma.item.upsert({
    where: { id: "tuna" },
    update: {},
    create: {
      id: "tuna",
      key: "tuna",
      name: "Tuna",
      description: "A large open-water fish.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 20,
      stackable: true,
      maxStack: 99,
    },
  });

  const eel = await prisma.item.upsert({
    where: { id: "eel" },
    update: {},
    create: {
      id: "eel",
      key: "eel",
      name: "Eel",
      description: "A slippery nocturnal fish.",
      itemType: "MATERIAL",
      itemRarity: "UNCOMMON",
      tier: 2,
      value: 22,
      stackable: true,
      maxStack: 99,
    },
  });

  const snapper = await prisma.item.upsert({
    where: { id: "snapper" },
    update: {},
    create: {
      id: "snapper",
      key: "snapper",
      name: "Snapper",
      description: "A colorful reef fish.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 35,
      stackable: true,
      maxStack: 99,
    },
  });

  const salmon = await prisma.item.upsert({
    where: { id: "salmon" },
    update: {},
    create: {
      id: "salmon",
      key: "salmon",
      name: "Salmon",
      description: "A prized coldwater fish.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 45,
      stackable: true,
      maxStack: 99,
    },
  });

  const crustacean = await prisma.item.upsert({
    where: { id: "crustacean" },
    update: {},
    create: {
      id: "crustacean",
      key: "crustacean",
      name: "Deep Crustacean",
      description: "A deep-sea crustacean.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 50,
      stackable: true,
      maxStack: 99,
    },
  });

  const swordfish = await prisma.item.upsert({
    where: { id: "swordfish" },
    update: {},
    create: {
      id: "swordfish",
      key: "swordfish",
      name: "Swordfish",
      description: "A powerful storm-chasing fish.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 55,
      stackable: true,
      maxStack: 99,
    },
  });

  const blackfinTuna = await prisma.item.upsert({
    where: { id: "blackfin-tuna" },
    update: {},
    create: {
      id: "blackfin-tuna",
      key: "blackfin-tuna",
      name: "Blackfin Tuna",
      description: "An aggressive deep-water tuna.",
      itemType: "MATERIAL",
      itemRarity: "RARE",
      tier: 3,
      value: 60,
      stackable: true,
      maxStack: 99,
    },
  });

  const abyssalCod = await prisma.item.upsert({
    where: { id: "abyssal-cod" },
    update: {},
    create: {
      id: "abyssal-cod",
      key: "abyssal-cod",
      name: "Abyssal Cod",
      description: "A cod from the deep abyss.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 80,
      stackable: true,
      maxStack: 99,
    },
  });

  const marlin = await prisma.item.upsert({
    where: { id: "marlin" },
    update: {},
    create: {
      id: "marlin",
      key: "marlin",
      name: "Marlin",
      description: "A legendary billfish from whirlpools.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 100,
      stackable: true,
      maxStack: 99,
    },
  });

  const trenchKelp = await prisma.item.upsert({
    where: { id: "trench-kelp" },
    update: {},
    create: {
      id: "trench-kelp",
      key: "trench-kelp",
      name: "Kraken-Kelp",
      description: "Rare kelp from deep trenches.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 120,
      stackable: true,
      maxStack: 99,
    },
  });

  const tempestFish = await prisma.item.upsert({
    where: { id: "tempest-fish" },
    update: {},
    create: {
      id: "tempest-fish",
      key: "tempest-fish",
      name: "Tempest Fish",
      description: "A fish caught in storm currents.",
      itemType: "MATERIAL",
      itemRarity: "EPIC",
      tier: 4,
      value: 140,
      stackable: true,
      maxStack: 99,
    },
  });

  const anglerfish = await prisma.item.upsert({
    where: { id: "anglerfish" },
    update: {},
    create: {
      id: "anglerfish",
      key: "anglerfish",
      name: "Midnight Angler",
      description: "A deep-sea anglerfish from the rift.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 200,
      stackable: true,
      maxStack: 99,
    },
  });

  const relicScale = await prisma.item.upsert({
    where: { id: "relic-scale" },
    update: {},
    create: {
      id: "relic-scale",
      key: "relic-scale",
      name: "Relic Scale",
      description: "A scale from a sunken relic shoal.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 250,
      stackable: true,
      maxStack: 99,
    },
  });

  const glassSturgeon = await prisma.item.upsert({
    where: { id: "glass-sturgeon" },
    update: {},
    create: {
      id: "glass-sturgeon",
      key: "glass-sturgeon",
      name: "Glass-Sea Sturgeon",
      description: "A translucent sturgeon from glassy waters.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 300,
      stackable: true,
      maxStack: 99,
    },
  });

  const leviathanMeat = await prisma.item.upsert({
    where: { id: "leviathan-meat" },
    update: {},
    create: {
      id: "leviathan-meat",
      key: "leviathan-meat",
      name: "Leviathan Meat",
      description: "Meat from the spine of a leviathan.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 400,
      stackable: true,
      maxStack: 99,
    },
  });

  const mythicRoe = await prisma.item.upsert({
    where: { id: "mythic-roe" },
    update: {},
    create: {
      id: "mythic-roe",
      key: "mythic-roe",
      name: "Mythic Roe",
      description: "Roe from the mythical maw whirlpool.",
      itemType: "MATERIAL",
      itemRarity: "LEGENDARY",
      tier: 5,
      value: 500,
      stackable: true,
      maxStack: 99,
    },
  });

  // Fisher nodes - 25 nodes total with tier progression
  console.log("Creating Fisher nodes...");

  // TIER 1 (1–20)
  const fisherNodes = [
    // Tier 1
    { key: "shallow-minnow-shoal", name: "Shallow Minnow Shoal", reqLevel: 1, time: 25, xp: 12, danger: 0, tier: 1, itemId: minnow.id, minQty: 1, maxQty: 3 },
    { key: "river-perch-run", name: "River Perch Run", reqLevel: 5, time: 30, xp: 15, danger: 0, tier: 1, itemId: perch.id, minQty: 1, maxQty: 3 },
    { key: "pond-carp-cluster", name: "Pond Carp Cluster", reqLevel: 10, time: 35, xp: 18, danger: 0, tier: 1, itemId: carp.id, minQty: 1, maxQty: 4 },
    { key: "coastal-sardine-school", name: "Coastal Sardine School", reqLevel: 15, time: 40, xp: 22, danger: 1, tier: 1, itemId: sardine.id, minQty: 2, maxQty: 4 },
    { key: "rocky-tidepool-harvest", name: "Rocky Tidepool Harvest", reqLevel: 20, time: 45, xp: 25, danger: 1, tier: 1, itemId: tidepoolShellfish.id, minQty: 2, maxQty: 4 },
    // Tier 2
    { key: "deep-river-catfish", name: "Deep River Catfish", reqLevel: 25, time: 75, xp: 35, danger: 1, tier: 2, itemId: catfish.id, minQty: 1, maxQty: 4 },
    { key: "bay-mackerel-sweep", name: "Bay Mackerel Sweep", reqLevel: 30, time: 90, xp: 42, danger: 1, tier: 2, itemId: mackerel.id, minQty: 2, maxQty: 5 },
    { key: "kelpbed-shellfish-bed", name: "Kelpbed Shellfish Bed", reqLevel: 35, time: 105, xp: 50, danger: 2, tier: 2, itemId: kelpShellfish.id, minQty: 1, maxQty: 5 },
    { key: "open-water-tuna-trail", name: "Open-Water Tuna Trail", reqLevel: 38, time: 115, xp: 55, danger: 2, tier: 2, itemId: tuna.id, minQty: 2, maxQty: 5 },
    { key: "night-eel-drift", name: "Night Eel Drift", reqLevel: 40, time: 120, xp: 60, danger: 2, tier: 2, itemId: eel.id, minQty: 1, maxQty: 5 },
    // Tier 3
    { key: "reef-snapper-grounds", name: "Reef Snapper Grounds", reqLevel: 45, time: 150, xp: 80, danger: 2, tier: 3, itemId: snapper.id, minQty: 1, maxQty: 6 },
    { key: "coldwater-salmon-route", name: "Coldwater Salmon Route", reqLevel: 50, time: 180, xp: 95, danger: 3, tier: 3, itemId: salmon.id, minQty: 2, maxQty: 7 },
    { key: "deep-crustacean-pots", name: "Deep Crustacean Pots", reqLevel: 55, time: 210, xp: 110, danger: 3, tier: 3, itemId: crustacean.id, minQty: 1, maxQty: 7 },
    { key: "storm-shoal-swordfish", name: "Storm Shoal Swordfish", reqLevel: 58, time: 225, xp: 115, danger: 3, tier: 3, itemId: swordfish.id, minQty: 2, maxQty: 7 },
    { key: "blackfin-tuna-surge", name: "Blackfin Tuna Surge", reqLevel: 60, time: 240, xp: 120, danger: 3, tier: 3, itemId: blackfinTuna.id, minQty: 1, maxQty: 7 },
    // Tier 4
    { key: "abyssal-cod-drop", name: "Abyssal Cod Drop", reqLevel: 65, time: 300, xp: 150, danger: 3, tier: 4, itemId: abyssalCod.id, minQty: 1, maxQty: 3 },
    { key: "reef-leviathan-bycatch", name: "Reef Leviathan Bycatch", reqLevel: 70, time: 360, xp: 175, danger: 4, tier: 4, itemId: marlin.id, minQty: 1, maxQty: 4 },
    { key: "whirlpool-marlin-chase", name: "Whirlpool Marlin Chase", reqLevel: 75, time: 420, xp: 200, danger: 4, tier: 4, itemId: marlin.id, minQty: 1, maxQty: 4 },
    { key: "kraken-kelp-trench", name: "Kraken-Kelp Trench", reqLevel: 78, time: 480, xp: 220, danger: 4, tier: 4, itemId: trenchKelp.id, minQty: 2, maxQty: 4 },
    { key: "tempest-current-harvest", name: "Tempest Current Harvest", reqLevel: 80, time: 540, xp: 240, danger: 4, tier: 4, itemId: tempestFish.id, minQty: 1, maxQty: 4 },
    // Tier 5
    { key: "midnight-angler-rift", name: "Midnight Angler Rift", reqLevel: 85, time: 900, xp: 360, danger: 4, tier: 5, itemId: anglerfish.id, minQty: 1, maxQty: 2 },
    { key: "sunken-relic-shoal", name: "Sunken Relic Shoal", reqLevel: 88, time: 1050, xp: 420, danger: 4, tier: 5, itemId: relicScale.id, minQty: 1, maxQty: 2 },
    { key: "glass-sea-sturgeon", name: "Glass-Sea Sturgeon", reqLevel: 90, time: 1200, xp: 480, danger: 5, tier: 5, itemId: glassSturgeon.id, minQty: 1, maxQty: 1 },
    { key: "leviathan-spinewater", name: "Leviathan Spinewater", reqLevel: 95, time: 1350, xp: 540, danger: 5, tier: 5, itemId: leviathanMeat.id, minQty: 1, maxQty: 1 },
    { key: "mythic-maw-whirlpool", name: "Mythic Maw Whirlpool", reqLevel: 100, time: 1500, xp: 600, danger: 5, tier: 5, itemId: mythicRoe.id, minQty: 1, maxQty: 2 },
  ];

  for (const nodeData of fisherNodes) {
    const node = await prisma.gatheringNode.upsert({
      where: { key: nodeData.key },
      update: {
        tier: nodeData.tier,
        requiredJobLevel: nodeData.reqLevel,
        gatherTimeSeconds: nodeData.time,
        xpReward: nodeData.xp,
        dangerTier: nodeData.danger,
      },
      create: {
        key: nodeData.key,
        name: nodeData.name,
        description: `A fishing spot for ${nodeData.name.toLowerCase()}.`,
        jobId: fisherJob.id,
        dangerTier: nodeData.danger,
        tier: nodeData.tier,
        requiredJobLevel: nodeData.reqLevel,
        gatherTimeSeconds: nodeData.time,
        xpReward: nodeData.xp,
        status: "ACTIVE",
      },
    });

    await prisma.nodeYield.upsert({
      where: { id: `${node.id}-${nodeData.itemId}` },
      update: {
        minQty: nodeData.minQty,
        maxQty: nodeData.maxQty,
      },
      create: {
        id: `${node.id}-${nodeData.itemId}`,
        nodeId: node.id,
        itemId: nodeData.itemId,
        minQty: nodeData.minQty,
        maxQty: nodeData.maxQty,
        weight: 100,
      },
    });
  }

  // Herbalist nodes - Tier 1 (levels 1-20)
  const meadowleafPatch = await prisma.gatheringNode.upsert({
    where: { key: "meadowleaf-patch" },
    update: {},
    create: {
      key: "meadowleaf-patch",
      name: "Meadowleaf Patch",
      description: "A peaceful meadow filled with common herbs.",
      jobId: herbalistJob.id,
      tier: 1,
      requiredJobLevel: 1,
      gatherTimeSeconds: 25,
      xpReward: 12,
      dangerTier: 0,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${meadowleafPatch.id}-meadowleaf` },
    update: {},
    create: {
      id: `${meadowleafPatch.id}-meadowleaf`,
      nodeId: meadowleafPatch.id,
      itemId: meadowleaf.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const wildmintCluster = await prisma.gatheringNode.upsert({
    where: { key: "wildmint-cluster" },
    update: {},
    create: {
      key: "wildmint-cluster",
      name: "Wildmint Cluster",
      description: "A cluster of wild mint growing near water.",
      jobId: herbalistJob.id,
      tier: 1,
      requiredJobLevel: 5,
      gatherTimeSeconds: 30,
      xpReward: 15,
      dangerTier: 0,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${wildmintCluster.id}-wildmint` },
    update: {},
    create: {
      id: `${wildmintCluster.id}-wildmint`,
      nodeId: wildmintCluster.id,
      itemId: wildmint.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  const bitterrootSprouts = await prisma.gatheringNode.upsert({
    where: { key: "bitterroot-sprouts" },
    update: {},
    create: {
      key: "bitterroot-sprouts",
      name: "Bitterroot Sprouts",
      description: "Fresh bitterroot sprouts emerging from the ground.",
      jobId: herbalistJob.id,
      tier: 1,
      requiredJobLevel: 10,
      gatherTimeSeconds: 35,
      xpReward: 18,
      dangerTier: 0,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${bitterrootSprouts.id}-bitterroot` },
    update: {},
    create: {
      id: `${bitterrootSprouts.id}-bitterroot`,
      nodeId: bitterrootSprouts.id,
      itemId: bitterroot.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const sunblossomField = await prisma.gatheringNode.upsert({
    where: { key: "sunblossom-field" },
    update: {},
    create: {
      key: "sunblossom-field",
      name: "Sunblossom Field",
      description: "A field of sunblossoms basking in the sunlight.",
      jobId: herbalistJob.id,
      tier: 1,
      requiredJobLevel: 15,
      gatherTimeSeconds: 40,
      xpReward: 22,
      dangerTier: 1,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${sunblossomField.id}-sunblossom` },
    update: {},
    create: {
      id: `${sunblossomField.id}-sunblossom`,
      nodeId: sunblossomField.id,
      itemId: sunblossom.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const creeksideReedbed = await prisma.gatheringNode.upsert({
    where: { key: "creekside-reedbed" },
    update: {},
    create: {
      key: "creekside-reedbed",
      name: "Creekside Reedbed",
      description: "Reeds growing along a peaceful creek.",
      jobId: herbalistJob.id,
      tier: 1,
      requiredJobLevel: 20,
      gatherTimeSeconds: 45,
      xpReward: 25,
      dangerTier: 1,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${creeksideReedbed.id}-creek-reed` },
    update: {},
    create: {
      id: `${creeksideReedbed.id}-creek-reed`,
      nodeId: creeksideReedbed.id,
      itemId: creekReed.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  // Herbalist nodes - Tier 2 (levels 21-40)
  const duskleafThicket = await prisma.gatheringNode.upsert({
    where: { key: "duskleaf-thicket" },
    update: {},
    create: {
      key: "duskleaf-thicket",
      name: "Duskleaf Thicket",
      description: "A dense thicket of duskleaf plants.",
      jobId: herbalistJob.id,
      tier: 2,
      requiredJobLevel: 25,
      gatherTimeSeconds: 75,
      xpReward: 35,
      dangerTier: 1,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${duskleafThicket.id}-duskleaf` },
    update: {},
    create: {
      id: `${duskleafThicket.id}-duskleaf`,
      nodeId: duskleafThicket.id,
      itemId: duskleaf.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const thornshadeBramble = await prisma.gatheringNode.upsert({
    where: { key: "thornshade-bramble" },
    update: {},
    create: {
      key: "thornshade-bramble",
      name: "Thornshade Bramble",
      description: "A dangerous bramble of thornshade vines.",
      jobId: herbalistJob.id,
      tier: 2,
      requiredJobLevel: 30,
      gatherTimeSeconds: 90,
      xpReward: 42,
      dangerTier: 1,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${thornshadeBramble.id}-thornshade-vine` },
    update: {},
    create: {
      id: `${thornshadeBramble.id}-thornshade-vine`,
      nodeId: thornshadeBramble.id,
      itemId: thornshadeVine.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  const mooncapMushroomRing = await prisma.gatheringNode.upsert({
    where: { key: "mooncap-mushroom-ring" },
    update: {},
    create: {
      key: "mooncap-mushroom-ring",
      name: "Mooncap Mushroom Ring",
      description: "A ring of luminescent mooncap mushrooms.",
      jobId: herbalistJob.id,
      tier: 2,
      requiredJobLevel: 35,
      gatherTimeSeconds: 105,
      xpReward: 50,
      dangerTier: 2,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${mooncapMushroomRing.id}-mooncap` },
    update: {},
    create: {
      id: `${mooncapMushroomRing.id}-mooncap`,
      nodeId: mooncapMushroomRing.id,
      itemId: mooncap.id,
      minQty: 1,
      maxQty: 4,
      weight: 100,
    },
  });

  const frostbudRidge = await prisma.gatheringNode.upsert({
    where: { key: "frostbud-ridge" },
    update: {},
    create: {
      key: "frostbud-ridge",
      name: "Frostbud Ridge",
      description: "A high ridge where frostbuds grow in the cold winds.",
      jobId: herbalistJob.id,
      tier: 2,
      requiredJobLevel: 38,
      gatherTimeSeconds: 115,
      xpReward: 55,
      dangerTier: 2,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${frostbudRidge.id}-frostbud` },
    update: {},
    create: {
      id: `${frostbudRidge.id}-frostbud`,
      nodeId: frostbudRidge.id,
      itemId: frostbud.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const nightshadeHollow = await prisma.gatheringNode.upsert({
    where: { key: "nightshade-hollow" },
    update: {},
    create: {
      key: "nightshade-hollow",
      name: "Nightshade Hollow",
      description: "A dark hollow where nightshade blooms at dusk.",
      jobId: herbalistJob.id,
      tier: 2,
      requiredJobLevel: 40,
      gatherTimeSeconds: 120,
      xpReward: 60,
      dangerTier: 2,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${nightshadeHollow.id}-nightshade` },
    update: {},
    create: {
      id: `${nightshadeHollow.id}-nightshade`,
      nodeId: nightshadeHollow.id,
      itemId: nightshade.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  // Herbalist nodes - Tier 3 (levels 41-60)
  const emberbloomGrove = await prisma.gatheringNode.upsert({
    where: { key: "emberbloom-grove" },
    update: {},
    create: {
      key: "emberbloom-grove",
      name: "Emberbloom Grove",
      description: "A grove of emberblooms radiating warmth.",
      jobId: herbalistJob.id,
      tier: 3,
      requiredJobLevel: 45,
      gatherTimeSeconds: 150,
      xpReward: 80,
      dangerTier: 2,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${emberbloomGrove.id}-emberbloom` },
    update: {},
    create: {
      id: `${emberbloomGrove.id}-emberbloom`,
      nodeId: emberbloomGrove.id,
      itemId: emberbloom.id,
      minQty: 1,
      maxQty: 4,
      weight: 100,
    },
  });

  const silverthornGlade = await prisma.gatheringNode.upsert({
    where: { key: "silverthorn-glade" },
    update: {},
    create: {
      key: "silverthorn-glade",
      name: "Silverthorn Glade",
      description: "A glade filled with silverthorn bushes.",
      jobId: herbalistJob.id,
      tier: 3,
      requiredJobLevel: 50,
      gatherTimeSeconds: 180,
      xpReward: 95,
      dangerTier: 3,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${silverthornGlade.id}-silverthorn` },
    update: {},
    create: {
      id: `${silverthornGlade.id}-silverthorn`,
      nodeId: silverthornGlade.id,
      itemId: silverthorn.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  const deepwoodMyceliumBed = await prisma.gatheringNode.upsert({
    where: { key: "deepwood-mycelium-bed" },
    update: {},
    create: {
      key: "deepwood-mycelium-bed",
      name: "Deepwood Mycelium Bed",
      description: "A bed of mycelium in the deepest parts of the forest.",
      jobId: herbalistJob.id,
      tier: 3,
      requiredJobLevel: 55,
      gatherTimeSeconds: 210,
      xpReward: 110,
      dangerTier: 3,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${deepwoodMyceliumBed.id}-deepwood-mycelium` },
    update: {},
    create: {
      id: `${deepwoodMyceliumBed.id}-deepwood-mycelium`,
      nodeId: deepwoodMyceliumBed.id,
      itemId: deepwoodMycelium.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const stormpetalSlope = await prisma.gatheringNode.upsert({
    where: { key: "stormpetal-slope" },
    update: {},
    create: {
      key: "stormpetal-slope",
      name: "Stormpetal Slope",
      description: "A slope where stormpetals grow during thunderstorms.",
      jobId: herbalistJob.id,
      tier: 3,
      requiredJobLevel: 58,
      gatherTimeSeconds: 225,
      xpReward: 115,
      dangerTier: 3,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${stormpetalSlope.id}-stormpetal` },
    update: {},
    create: {
      id: `${stormpetalSlope.id}-stormpetal`,
      nodeId: stormpetalSlope.id,
      itemId: stormpetal.id,
      minQty: 2,
      maxQty: 6,
      weight: 100,
    },
  });

  const bloodmossMarsh = await prisma.gatheringNode.upsert({
    where: { key: "bloodmoss-marsh" },
    update: {},
    create: {
      key: "bloodmoss-marsh",
      name: "Bloodmoss Marsh",
      description: "A marsh where bloodmoss grows in crimson patches.",
      jobId: herbalistJob.id,
      tier: 3,
      requiredJobLevel: 60,
      gatherTimeSeconds: 240,
      xpReward: 120,
      dangerTier: 3,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${bloodmossMarsh.id}-bloodmoss` },
    update: {},
    create: {
      id: `${bloodmossMarsh.id}-bloodmoss`,
      nodeId: bloodmossMarsh.id,
      itemId: bloodmoss.id,
      minQty: 3,
      maxQty: 7,
      weight: 100,
    },
  });

  // Herbalist nodes - Tier 4 (levels 61-80)
  const wraithorchidClearing = await prisma.gatheringNode.upsert({
    where: { key: "wraithorchid-clearing" },
    update: {},
    create: {
      key: "wraithorchid-clearing",
      name: "Wraithorchid Clearing",
      description: "A clearing where ethereal wraithorchids phase in and out of existence.",
      jobId: herbalistJob.id,
      tier: 4,
      requiredJobLevel: 65,
      gatherTimeSeconds: 300,
      xpReward: 150,
      dangerTier: 3,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${wraithorchidClearing.id}-wraithorchid` },
    update: {},
    create: {
      id: `${wraithorchidClearing.id}-wraithorchid`,
      nodeId: wraithorchidClearing.id,
      itemId: wraithorchid.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const ancientGinsengVein = await prisma.gatheringNode.upsert({
    where: { key: "ancient-ginseng-vein" },
    update: {},
    create: {
      key: "ancient-ginseng-vein",
      name: "Ancient Ginseng Vein",
      description: "A vein of ancient ginseng roots deep underground.",
      jobId: herbalistJob.id,
      tier: 4,
      requiredJobLevel: 70,
      gatherTimeSeconds: 360,
      xpReward: 175,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${ancientGinsengVein.id}-ancient-ginseng` },
    update: {},
    create: {
      id: `${ancientGinsengVein.id}-ancient-ginseng`,
      nodeId: ancientGinsengVein.id,
      itemId: ancientGinseng.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const spiritvineCanopy = await prisma.gatheringNode.upsert({
    where: { key: "spiritvine-canopy" },
    update: {},
    create: {
      key: "spiritvine-canopy",
      name: "Spiritvine Canopy",
      description: "A canopy of spiritvines high in the ancient trees.",
      jobId: herbalistJob.id,
      tier: 4,
      requiredJobLevel: 75,
      gatherTimeSeconds: 420,
      xpReward: 200,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${spiritvineCanopy.id}-spiritvine` },
    update: {},
    create: {
      id: `${spiritvineCanopy.id}-spiritvine`,
      nodeId: spiritvineCanopy.id,
      itemId: spiritvine.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  const venomflowerRavine = await prisma.gatheringNode.upsert({
    where: { key: "venomflower-ravine" },
    update: {},
    create: {
      key: "venomflower-ravine",
      name: "Venomflower Ravine",
      description: "A dangerous ravine filled with venomous flowers.",
      jobId: herbalistJob.id,
      tier: 4,
      requiredJobLevel: 78,
      gatherTimeSeconds: 480,
      xpReward: 220,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${venomflowerRavine.id}-venomflower` },
    update: {},
    create: {
      id: `${venomflowerRavine.id}-venomflower`,
      nodeId: venomflowerRavine.id,
      itemId: venomflower.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const tempestbloomHighlands = await prisma.gatheringNode.upsert({
    where: { key: "tempestbloom-highlands" },
    update: {},
    create: {
      key: "tempestbloom-highlands",
      name: "Tempestbloom Highlands",
      description: "Highlands where tempestblooms channel the power of storms.",
      jobId: herbalistJob.id,
      tier: 4,
      requiredJobLevel: 80,
      gatherTimeSeconds: 540,
      xpReward: 240,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${tempestbloomHighlands.id}-tempestbloom` },
    update: {},
    create: {
      id: `${tempestbloomHighlands.id}-tempestbloom`,
      nodeId: tempestbloomHighlands.id,
      itemId: tempestbloom.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  // Herbalist nodes - Tier 5 (levels 81-100)
  const starlotusSpring = await prisma.gatheringNode.upsert({
    where: { key: "starlotus-spring" },
    update: {},
    create: {
      key: "starlotus-spring",
      name: "Starlotus Spring",
      description: "A sacred spring where starlotus blossoms glow with starlight.",
      jobId: herbalistJob.id,
      tier: 5,
      requiredJobLevel: 85,
      gatherTimeSeconds: 900,
      xpReward: 360,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${starlotusSpring.id}-starlotus` },
    update: {},
    create: {
      id: `${starlotusSpring.id}-starlotus`,
      nodeId: starlotusSpring.id,
      itemId: starlotus.id,
      minQty: 1,
      maxQty: 1,
      weight: 100,
    },
  });

  const umbralTruffleBurrow = await prisma.gatheringNode.upsert({
    where: { key: "umbral-truffle-burrow" },
    update: {},
    create: {
      key: "umbral-truffle-burrow",
      name: "Umbral Truffle Burrow",
      description: "A burrow where umbral truffles exist between shadows.",
      jobId: herbalistJob.id,
      tier: 5,
      requiredJobLevel: 88,
      gatherTimeSeconds: 1050,
      xpReward: 420,
      dangerTier: 4,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${umbralTruffleBurrow.id}-umbral-truffle` },
    update: {},
    create: {
      id: `${umbralTruffleBurrow.id}-umbral-truffle`,
      nodeId: umbralTruffleBurrow.id,
      itemId: umbralTruffle.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const celestialSaffronTerrace = await prisma.gatheringNode.upsert({
    where: { key: "celestial-saffron-terrace" },
    update: {},
    create: {
      key: "celestial-saffron-terrace",
      name: "Celestial Saffron Terrace",
      description: "Terraced fields where celestial saffron shimmers with divine energy.",
      jobId: herbalistJob.id,
      tier: 5,
      requiredJobLevel: 90,
      gatherTimeSeconds: 1200,
      xpReward: 480,
      dangerTier: 5,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${celestialSaffronTerrace.id}-celestial-saffron` },
    update: {},
    create: {
      id: `${celestialSaffronTerrace.id}-celestial-saffron`,
      nodeId: celestialSaffronTerrace.id,
      itemId: celestialSaffron.id,
      minQty: 1,
      maxQty: 1,
      weight: 100,
    },
  });

  const phoenixfernCrater = await prisma.gatheringNode.upsert({
    where: { key: "phoenixfern-crater" },
    update: {},
    create: {
      key: "phoenixfern-crater",
      name: "Phoenixfern Crater",
      description: "A volcanic crater where phoenixfern regenerates from ashes.",
      jobId: herbalistJob.id,
      tier: 5,
      requiredJobLevel: 95,
      gatherTimeSeconds: 1350,
      xpReward: 540,
      dangerTier: 5,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${phoenixfernCrater.id}-phoenixfern` },
    update: {},
    create: {
      id: `${phoenixfernCrater.id}-phoenixfern`,
      nodeId: phoenixfernCrater.id,
      itemId: phoenixfern.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const worldrootHeartgrove = await prisma.gatheringNode.upsert({
    where: { key: "worldroot-heartgrove" },
    update: {},
    create: {
      key: "worldroot-heartgrove",
      name: "Worldroot Heartgrove",
      description: "The legendary grove where the worldroot connects all realms.",
      jobId: herbalistJob.id,
      tier: 5,
      requiredJobLevel: 100,
      gatherTimeSeconds: 1500,
      xpReward: 600,
      dangerTier: 5,
    },
  });
  await prisma.nodeYield.upsert({
    where: { id: `${worldrootHeartgrove.id}-worldroot` },
    update: {},
    create: {
      id: `${worldrootHeartgrove.id}-worldroot`,
      nodeId: worldrootHeartgrove.id,
      itemId: worldroot.id,
      minQty: 1,
      maxQty: 1,
      weight: 100,
    },
  });

  // Logger nodes - Tier 1 (levels 1-20)
  const saplingGrove = await prisma.gatheringNode.upsert({
    where: { key: "sapling-grove" },
    update: {},
    create: {
      key: "sapling-grove",
      name: "Sapling Grove",
      description: "A grove of young saplings ready for harvesting.",
      jobId: loggerJob.id,
      dangerTier: 0,
      tier: 1,
      requiredJobLevel: 1,
      gatherTimeSeconds: 25,
      xpReward: 12,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${saplingGrove.id}-sapling-wood` },
    update: {},
    create: {
      id: `${saplingGrove.id}-sapling-wood`,
      nodeId: saplingGrove.id,
      itemId: saplingWood.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const pineStand = await prisma.gatheringNode.upsert({
    where: { key: "pine-stand" },
    update: {},
    create: {
      key: "pine-stand",
      name: "Pine Stand",
      description: "A stand of pine trees.",
      jobId: loggerJob.id,
      dangerTier: 0,
      tier: 1,
      requiredJobLevel: 5,
      gatherTimeSeconds: 30,
      xpReward: 15,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${pineStand.id}-pine-logs` },
    update: {},
    create: {
      id: `${pineStand.id}-pine-logs`,
      nodeId: pineStand.id,
      itemId: pineLogs.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const birchCopse = await prisma.gatheringNode.upsert({
    where: { key: "birch-copse" },
    update: {},
    create: {
      key: "birch-copse",
      name: "Birch Copse",
      description: "A small grove of birch trees.",
      jobId: loggerJob.id,
      dangerTier: 0,
      tier: 1,
      requiredJobLevel: 10,
      gatherTimeSeconds: 35,
      xpReward: 18,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${birchCopse.id}-birch-logs` },
    update: {},
    create: {
      id: `${birchCopse.id}-birch-logs`,
      nodeId: birchCopse.id,
      itemId: birchLogs.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  const cedarThicket = await prisma.gatheringNode.upsert({
    where: { key: "cedar-thicket" },
    update: {},
    create: {
      key: "cedar-thicket",
      name: "Cedar Thicket",
      description: "A dense thicket of cedar trees.",
      jobId: loggerJob.id,
      dangerTier: 1,
      tier: 1,
      requiredJobLevel: 15,
      gatherTimeSeconds: 40,
      xpReward: 22,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${cedarThicket.id}-cedar-logs` },
    update: {},
    create: {
      id: `${cedarThicket.id}-cedar-logs`,
      nodeId: cedarThicket.id,
      itemId: cedarLogs.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  const oakCluster = await prisma.gatheringNode.upsert({
    where: { key: "oak-cluster" },
    update: {},
    create: {
      key: "oak-cluster",
      name: "Oak Cluster",
      description: "A cluster of mature oak trees.",
      jobId: loggerJob.id,
      dangerTier: 1,
      tier: 1,
      requiredJobLevel: 20,
      gatherTimeSeconds: 45,
      xpReward: 25,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${oakCluster.id}-oak-logs` },
    update: {},
    create: {
      id: `${oakCluster.id}-oak-logs`,
      nodeId: oakCluster.id,
      itemId: oakLogs.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  // Logger nodes - Tier 2 (levels 21-40)
  const mapleRise = await prisma.gatheringNode.upsert({
    where: { key: "maple-rise" },
    update: {},
    create: {
      key: "maple-rise",
      name: "Maple Rise",
      description: "A rise covered in maple trees.",
      jobId: loggerJob.id,
      dangerTier: 1,
      tier: 2,
      requiredJobLevel: 25,
      gatherTimeSeconds: 75,
      xpReward: 35,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${mapleRise.id}-maple-logs` },
    update: {},
    create: {
      id: `${mapleRise.id}-maple-logs`,
      nodeId: mapleRise.id,
      itemId: mapleLogs.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const ashwoodLine = await prisma.gatheringNode.upsert({
    where: { key: "ashwood-line" },
    update: {},
    create: {
      key: "ashwood-line",
      name: "Ashwood Line",
      description: "A line of ashwood trees.",
      jobId: loggerJob.id,
      dangerTier: 1,
      tier: 2,
      requiredJobLevel: 30,
      gatherTimeSeconds: 90,
      xpReward: 42,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${ashwoodLine.id}-ash-logs` },
    update: {},
    create: {
      id: `${ashwoodLine.id}-ash-logs`,
      nodeId: ashwoodLine.id,
      itemId: ashLogs.id,
      minQty: 1,
      maxQty: 4,
      weight: 100,
    },
  });

  const ironbarkTrunks = await prisma.gatheringNode.upsert({
    where: { key: "ironbark-trunks" },
    update: {},
    create: {
      key: "ironbark-trunks",
      name: "Ironbark Trunks",
      description: "Massive trunks of ironbark trees.",
      jobId: loggerJob.id,
      dangerTier: 2,
      tier: 2,
      requiredJobLevel: 35,
      gatherTimeSeconds: 105,
      xpReward: 50,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${ironbarkTrunks.id}-ironbark-logs` },
    update: {},
    create: {
      id: `${ironbarkTrunks.id}-ironbark-logs`,
      nodeId: ironbarkTrunks.id,
      itemId: ironbarkLogs.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  const redwoodEdge = await prisma.gatheringNode.upsert({
    where: { key: "redwood-edge" },
    update: {},
    create: {
      key: "redwood-edge",
      name: "Redwood Edge",
      description: "The edge of a redwood forest.",
      jobId: loggerJob.id,
      dangerTier: 2,
      tier: 2,
      requiredJobLevel: 38,
      gatherTimeSeconds: 115,
      xpReward: 55,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${redwoodEdge.id}-redwood-logs` },
    update: {},
    create: {
      id: `${redwoodEdge.id}-redwood-logs`,
      nodeId: redwoodEdge.id,
      itemId: redwoodLogs.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  const spruceRidge = await prisma.gatheringNode.upsert({
    where: { key: "spruce-ridge" },
    update: {},
    create: {
      key: "spruce-ridge",
      name: "Spruce Ridge",
      description: "A ridge covered in spruce trees.",
      jobId: loggerJob.id,
      dangerTier: 2,
      tier: 2,
      requiredJobLevel: 40,
      gatherTimeSeconds: 120,
      xpReward: 60,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${spruceRidge.id}-spruce-logs` },
    update: {},
    create: {
      id: `${spruceRidge.id}-spruce-logs`,
      nodeId: spruceRidge.id,
      itemId: spruceLogs.id,
      minQty: 2,
      maxQty: 5,
      weight: 100,
    },
  });

  // Logger nodes - Tier 3 (levels 41-60)
  const heartwoodOaks = await prisma.gatheringNode.upsert({
    where: { key: "heartwood-oaks" },
    update: {},
    create: {
      key: "heartwood-oaks",
      name: "Heartwood Oaks",
      description: "Ancient oaks with dense heartwood.",
      jobId: loggerJob.id,
      dangerTier: 2,
      tier: 3,
      requiredJobLevel: 45,
      gatherTimeSeconds: 150,
      xpReward: 80,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${heartwoodOaks.id}-heartwood` },
    update: {},
    create: {
      id: `${heartwoodOaks.id}-heartwood`,
      nodeId: heartwoodOaks.id,
      itemId: heartwood.id,
      minQty: 1,
      maxQty: 4,
      weight: 100,
    },
  });

  const blackwoodPines = await prisma.gatheringNode.upsert({
    where: { key: "blackwood-pines" },
    update: {},
    create: {
      key: "blackwood-pines",
      name: "Blackwood Pines",
      description: "Dark pines with blackwood cores.",
      jobId: loggerJob.id,
      dangerTier: 3,
      tier: 3,
      requiredJobLevel: 50,
      gatherTimeSeconds: 180,
      xpReward: 95,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${blackwoodPines.id}-blackwood-logs` },
    update: {},
    create: {
      id: `${blackwoodPines.id}-blackwood-logs`,
      nodeId: blackwoodPines.id,
      itemId: blackwoodLogs.id,
      minQty: 1,
      maxQty: 5,
      weight: 100,
    },
  });

  const deepforestTimberline = await prisma.gatheringNode.upsert({
    where: { key: "deepforest-timberline" },
    update: {},
    create: {
      key: "deepforest-timberline",
      name: "Deepforest Timberline",
      description: "The timberline of the deepest forests.",
      jobId: loggerJob.id,
      dangerTier: 3,
      tier: 3,
      requiredJobLevel: 55,
      gatherTimeSeconds: 210,
      xpReward: 110,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${deepforestTimberline.id}-deepforest-timber` },
    update: {},
    create: {
      id: `${deepforestTimberline.id}-deepforest-timber`,
      nodeId: deepforestTimberline.id,
      itemId: deepforestTimber.id,
      minQty: 1,
      maxQty: 6,
      weight: 100,
    },
  });

  const stormSplitCedar = await prisma.gatheringNode.upsert({
    where: { key: "storm-split-cedar" },
    update: {},
    create: {
      key: "storm-split-cedar",
      name: "Storm-Split Cedar",
      description: "Cedar trees split by storms.",
      jobId: loggerJob.id,
      dangerTier: 3,
      tier: 3,
      requiredJobLevel: 58,
      gatherTimeSeconds: 225,
      xpReward: 115,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${stormSplitCedar.id}-storm-cedar` },
    update: {},
    create: {
      id: `${stormSplitCedar.id}-storm-cedar`,
      nodeId: stormSplitCedar.id,
      itemId: stormCedar.id,
      minQty: 2,
      maxQty: 7,
      weight: 100,
    },
  });

  const resinousFirGiants = await prisma.gatheringNode.upsert({
    where: { key: "resinous-fir-giants" },
    update: {},
    create: {
      key: "resinous-fir-giants",
      name: "Resinous Fir Giants",
      description: "Giant firs with abundant resin.",
      jobId: loggerJob.id,
      dangerTier: 3,
      tier: 3,
      requiredJobLevel: 60,
      gatherTimeSeconds: 240,
      xpReward: 120,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${resinousFirGiants.id}-fir-resinwood` },
    update: {},
    create: {
      id: `${resinousFirGiants.id}-fir-resinwood`,
      nodeId: resinousFirGiants.id,
      itemId: firResinwood.id,
      minQty: 3,
      maxQty: 7,
      weight: 100,
    },
  });

  // Logger nodes - Tier 4 (levels 61-80)
  const ancientIronwood = await prisma.gatheringNode.upsert({
    where: { key: "ancient-ironwood" },
    update: {},
    create: {
      key: "ancient-ironwood",
      name: "Ancient Ironwood",
      description: "Ancient ironwood trees of legendary hardness.",
      jobId: loggerJob.id,
      dangerTier: 3,
      tier: 4,
      requiredJobLevel: 65,
      gatherTimeSeconds: 300,
      xpReward: 150,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${ancientIronwood.id}-ironwood-timber` },
    update: {},
    create: {
      id: `${ancientIronwood.id}-ironwood-timber`,
      nodeId: ancientIronwood.id,
      itemId: ironwoodTimber.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const elderRedwoodColossus = await prisma.gatheringNode.upsert({
    where: { key: "elder-redwood-colossus" },
    update: {},
    create: {
      key: "elder-redwood-colossus",
      name: "Elder Redwood Colossus",
      description: "A colossal elder redwood tree.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 4,
      requiredJobLevel: 70,
      gatherTimeSeconds: 360,
      xpReward: 175,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${elderRedwoodColossus.id}-elder-redwood-timber` },
    update: {},
    create: {
      id: `${elderRedwoodColossus.id}-elder-redwood-timber`,
      nodeId: elderRedwoodColossus.id,
      itemId: elderRedwoodTimber.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const ghostbarkGrove = await prisma.gatheringNode.upsert({
    where: { key: "ghostbark-grove" },
    update: {},
    create: {
      key: "ghostbark-grove",
      name: "Ghostbark Grove",
      description: "A grove of ethereal ghostbark trees.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 4,
      requiredJobLevel: 75,
      gatherTimeSeconds: 420,
      xpReward: 200,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${ghostbarkGrove.id}-ghostbark` },
    update: {},
    create: {
      id: `${ghostbarkGrove.id}-ghostbark`,
      nodeId: ghostbarkGrove.id,
      itemId: ghostbark.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  const thornwoodBrambletree = await prisma.gatheringNode.upsert({
    where: { key: "thornwood-brambletree" },
    update: {},
    create: {
      key: "thornwood-brambletree",
      name: "Thornwood Brambletree",
      description: "A massive brambletree with thornwood core.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 4,
      requiredJobLevel: 78,
      gatherTimeSeconds: 480,
      xpReward: 220,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${thornwoodBrambletree.id}-thornwood` },
    update: {},
    create: {
      id: `${thornwoodBrambletree.id}-thornwood`,
      nodeId: thornwoodBrambletree.id,
      itemId: thornwood.id,
      minQty: 1,
      maxQty: 4,
      weight: 100,
    },
  });

  const tempestPineHighlands = await prisma.gatheringNode.upsert({
    where: { key: "tempest-pine-highlands" },
    update: {},
    create: {
      key: "tempest-pine-highlands",
      name: "Tempest-Pine Highlands",
      description: "Highlands swept by tempests, home to rare pines.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 4,
      requiredJobLevel: 80,
      gatherTimeSeconds: 540,
      xpReward: 240,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${tempestPineHighlands.id}-tempest-pine` },
    update: {},
    create: {
      id: `${tempestPineHighlands.id}-tempest-pine`,
      nodeId: tempestPineHighlands.id,
      itemId: tempestPine.id,
      minQty: 2,
      maxQty: 4,
      weight: 100,
    },
  });

  // Logger nodes - Tier 5 (levels 81-100)
  const moonElderSequoia = await prisma.gatheringNode.upsert({
    where: { key: "moon-elder-sequoia" },
    update: {},
    create: {
      key: "moon-elder-sequoia",
      name: "Moon-Elder Sequoia",
      description: "A sequoia touched by moonlight.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 5,
      requiredJobLevel: 85,
      gatherTimeSeconds: 900,
      xpReward: 360,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${moonElderSequoia.id}-moon-sequoia-timber` },
    update: {},
    create: {
      id: `${moonElderSequoia.id}-moon-sequoia-timber`,
      nodeId: moonElderSequoia.id,
      itemId: moonSequoiaTimber.id,
      minQty: 1,
      maxQty: 1,
      weight: 100,
    },
  });

  const sunkenMangroveTitan = await prisma.gatheringNode.upsert({
    where: { key: "sunken-mangrove-titan" },
    update: {},
    create: {
      key: "sunken-mangrove-titan",
      name: "Sunken Mangrove Titan",
      description: "A titanic mangrove tree sunken in swampland.",
      jobId: loggerJob.id,
      dangerTier: 4,
      tier: 5,
      requiredJobLevel: 88,
      gatherTimeSeconds: 1050,
      xpReward: 420,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${sunkenMangroveTitan.id}-mangrove-corewood` },
    update: {},
    create: {
      id: `${sunkenMangroveTitan.id}-mangrove-corewood`,
      nodeId: sunkenMangroveTitan.id,
      itemId: mangroveCorewood.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const crystalheartYew = await prisma.gatheringNode.upsert({
    where: { key: "crystalheart-yew" },
    update: {},
    create: {
      key: "crystalheart-yew",
      name: "Crystalheart Yew",
      description: "A yew tree with a crystalline heart.",
      jobId: loggerJob.id,
      dangerTier: 5,
      tier: 5,
      requiredJobLevel: 90,
      gatherTimeSeconds: 1200,
      xpReward: 480,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${crystalheartYew.id}-crystal-yew-wood` },
    update: {},
    create: {
      id: `${crystalheartYew.id}-crystal-yew-wood`,
      nodeId: crystalheartYew.id,
      itemId: crystalYewWood.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const worldAshBranchspire = await prisma.gatheringNode.upsert({
    where: { key: "world-ash-branchspire" },
    update: {},
    create: {
      key: "world-ash-branchspire",
      name: "World-Ash Branchspire",
      description: "A branchspire of the legendary World-Ash.",
      jobId: loggerJob.id,
      dangerTier: 5,
      tier: 5,
      requiredJobLevel: 95,
      gatherTimeSeconds: 1350,
      xpReward: 540,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${worldAshBranchspire.id}-world-ash-timber` },
    update: {},
    create: {
      id: `${worldAshBranchspire.id}-world-ash-timber`,
      nodeId: worldAshBranchspire.id,
      itemId: worldAshTimber.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const mythicRootwoodMonolith = await prisma.gatheringNode.upsert({
    where: { key: "mythic-rootwood-monolith" },
    update: {},
    create: {
      key: "mythic-rootwood-monolith",
      name: "Mythic Rootwood Monolith",
      description: "The legendary Mythic Rootwood Monolith.",
      jobId: loggerJob.id,
      dangerTier: 5,
      tier: 5,
      requiredJobLevel: 100,
      gatherTimeSeconds: 1500,
      xpReward: 600,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${mythicRootwoodMonolith.id}-mythic-rootwood` },
    update: {},
    create: {
      id: `${mythicRootwoodMonolith.id}-mythic-rootwood`,
      nodeId: mythicRootwoodMonolith.id,
      itemId: mythicRootwood.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  // Tailor gathering (for cloth/leather - using existing nodes)
  // Cloth can be gathered from "fiber patch"
  const fiberPatch = await prisma.gatheringNode.upsert({
    where: { key: "fiber-patch-1" },
    update: {},
    create: {
      key: "fiber-patch-1",
      name: "Fiber Patch",
      description: "A patch of plant fibers for cloth.",
      jobId: tailorJob.id,
      dangerTier: 1,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${fiberPatch.id}-cloth` },
    update: {},
    create: {
      id: `${fiberPatch.id}-cloth`,
      nodeId: fiberPatch.id,
      itemId: cloth.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  // Create achievements
  console.log("Creating achievements...");

  const firstKill = await prisma.achievement.upsert({
    where: { key: "first-kill" },
    update: {},
    create: {
      key: "first-kill",
      name: "First Blood",
      description: "Defeat your first enemy in combat.",
      rarity: "COMMON",
    },
  });

  const veteran = await prisma.achievement.upsert({
    where: { key: "veteran" },
    update: {},
    create: {
      key: "veteran",
      name: "Veteran",
      description: "Reach level 10.",
      rarity: "UNCOMMON",
    },
  });

  const guildMember = await prisma.achievement.upsert({
    where: { key: "guild-member" },
    update: {},
    create: {
      key: "guild-member",
      name: "Guild Member",
      description: "Join a guild.",
      rarity: "COMMON",
    },
  });

  const masterCrafter = await prisma.achievement.upsert({
    where: { key: "master-crafter" },
    update: {},
    create: {
      key: "master-crafter",
      name: "Master Crafter",
      description: "Craft 100 items.",
      rarity: "RARE",
    },
  });

  const survivor = await prisma.achievement.upsert({
    where: { key: "survivor" },
    update: {},
    create: {
      key: "survivor",
      name: "Survivor",
      description: "Complete 50 encounters without dying.",
      rarity: "EPIC",
    },
  });

  console.log("✅ Achievements created!");

  // Create monsters
  console.log("Creating monsters...");

  const slime = await prisma.monster.upsert({
    where: { key: "slime-1" },
    update: {},
    create: {
      key: "slime-1",
      name: "Slime",
      level: 1,
      vitality: 3,
      strength: 2,
      speed: 2,
      dexterity: 1,
      maxHp: 20,
      xpReward: 10,
      goldReward: 5,
    },
  });

  const wolf = await prisma.monster.upsert({
    where: { key: "wolf-1" },
    update: {},
    create: {
      key: "wolf-1",
      name: "Wolf",
      level: 3,
      vitality: 5,
      strength: 6,
      speed: 7,
      dexterity: 5,
      maxHp: 35,
      xpReward: 30,
      goldReward: 15,
    },
  });

  const bandit = await prisma.monster.upsert({
    where: { key: "bandit-1" },
    update: {},
    create: {
      key: "bandit-1",
      name: "Bandit",
      level: 5,
      vitality: 7,
      strength: 8,
      speed: 6,
      dexterity: 7,
      maxHp: 50,
      xpReward: 50,
      goldReward: 25,
    },
  });

  console.log("✅ Monsters created!");

  // Try to attach achievements to first user if exists
  const firstUser = await prisma.user.findFirst({
    include: {
      profile: true,
    },
  });

  if (firstUser && firstUser.profile) {
    console.log("Attaching achievements to dev user...");
    
    // Attach 2-3 achievements
    await prisma.playerAchievement.upsert({
      where: {
        profileId_achievementId: {
          profileId: firstUser.profile.id,
          achievementId: firstKill.id,
        },
      },
      update: {},
      create: {
        profileId: firstUser.profile.id,
        achievementId: firstKill.id,
      },
    });

    await prisma.playerAchievement.upsert({
      where: {
        profileId_achievementId: {
          profileId: firstUser.profile.id,
          achievementId: veteran.id,
        },
      },
      update: {},
      create: {
        profileId: firstUser.profile.id,
        achievementId: veteran.id,
      },
    });

    await prisma.playerAchievement.upsert({
      where: {
        profileId_achievementId: {
          profileId: firstUser.profile.id,
          achievementId: guildMember.id,
        },
      },
      update: {},
      create: {
        profileId: firstUser.profile.id,
        achievementId: guildMember.id,
      },
    });

    console.log("✅ Achievements attached to dev user!");
  }

  // Create admin user
  console.log("Creating admin user...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@alicard.com" },
    update: {
      role: "ADMIN",
    },
    create: {
      email: "admin@alicard.com",
      username: "admin",
      password: adminPassword,
      gender: "OTHER",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", adminUser.username);

  // Create moderator user
  console.log("Creating moderator user...");
  const moderatorPassword = await bcrypt.hash("mod123", 10);
  const moderatorUser = await prisma.user.upsert({
    where: { email: "mod@alicard.com" },
    update: {
      role: "MODERATOR",
    },
    create: {
      email: "mod@alicard.com",
      username: "mod",
      password: moderatorPassword,
      gender: "OTHER",
      role: "MODERATOR",
    },
  });
  console.log("✅ Moderator user created:", moderatorUser.username);

  // Create content user
  console.log("Creating content user...");
  const contentPassword = await bcrypt.hash("content123", 10);
  const contentUser = await prisma.user.upsert({
    where: { email: "content@alicard.com" },
    update: {
      role: "CONTENT",
    },
    create: {
      email: "content@alicard.com",
      username: "content",
      password: contentPassword,
      gender: "OTHER",
      role: "CONTENT",
    },
  });
  console.log("✅ Content user created:", contentUser.username);

  // Create regular player user
  console.log("Creating player user...");
  const playerPassword = await bcrypt.hash("player123", 10);
  const playerUser = await prisma.user.upsert({
    where: { email: "player@alicard.com" },
    update: {},
    create: {
      email: "player@alicard.com",
      username: "player",
      password: playerPassword,
      gender: "OTHER",
      role: "PLAYER",
    },
  });
  console.log("✅ Player user created:", playerUser.username);

  // Create content templates
  console.log("Creating content templates...");

  // Item Templates
  const itemTemplate1 = await prisma.itemTemplate.create({
    data: {
      name: "Steel Sword",
      description: "A well-crafted steel sword",
      rarity: "RARE",
      stackable: false,
      maxStack: 1,
      value: 150,
      status: "ACTIVE",
      tags: ["weapon", "sword", "tier2"],
    },
  });

  const itemTemplate2 = await prisma.itemTemplate.create({
    data: {
      name: "Health Potion",
      description: "Restores 50 HP",
      rarity: "COMMON",
      stackable: true,
      maxStack: 99,
      value: 25,
      status: "ACTIVE",
      tags: ["consumable", "healing", "starter"],
    },
  });

  console.log("✅ Item templates created");

  // Monster Templates
  const monsterTemplate1 = await prisma.monsterTemplate.create({
    data: {
      name: "Goblin Warrior",
      description: "A fierce goblin warrior",
      level: 5,
      hp: 60,
      sp: 20,
      status: "ACTIVE",
      tags: ["goblin", "warrior", "tier1"],
      statsJSON: {
        vitality: 8,
        strength: 7,
        speed: 6,
        dexterity: 5,
      },
    },
  });

  console.log("✅ Monster template created");

  // Quest Templates
  const questTemplate1 = await prisma.questTemplate.upsert({
    where: { slug: "slay-the-goblin" },
    update: {},
    create: {
      name: "Slay the Goblin",
      slug: "slay-the-goblin",
      description: "Defeat 5 goblins in the forest",
      status: "ACTIVE",
    },
  });

  console.log("✅ Quest template created");

  // Map Zones
  const mapZone1 = await prisma.mapZone.create({
    data: {
      name: "Forest Zone",
      description: "A dense forest filled with danger",
      width: 10,
      height: 10,
      status: "ACTIVE",
      tags: ["forest", "starter", "low-danger"],
      tilesJSON: {
        "0,0": { type: "GRASS", zone: "LOW_DANGER" },
        "1,1": { type: "FOREST", zone: "MEDIUM_DANGER" },
      },
      poisJSON: [
        { x: 5, y: 5, type: "NPC", name: "Forest Guide" },
      ],
      spawnJSON: {
        monsters: [
          { type: "goblin", x: 3, y: 3, chance: 0.3 },
        ],
      },
    },
  });

  console.log("✅ Map zone created");

  // Create training skills
  console.log("Creating training skills...");

  // Mining skill
  const miningSkill = await prisma.trainingSkill.upsert({
    where: { key: "mining" },
    update: {},
    create: {
      key: "mining",
      name: "Mining",
      description: "Extract ores and minerals from the earth.",
      category: "GATHERING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: minerJob.id,
      tags: ["gathering", "starter"],
    },
  });

  // Mining action: Mine Iron Ore
  const mineIronOreAction = await prisma.skillAction.upsert({
    where: { key: "mine-iron-ore" },
    update: {},
    create: {
      key: "mine-iron-ore",
      name: "Mine Iron Ore",
      description: "Extract iron ore from a mining node.",
      skillId: miningSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 3,
      xpReward: 10,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${mineIronOreAction.id}-iron-ore` },
    update: {},
    create: {
      id: `${mineIronOreAction.id}-iron-ore`,
      actionId: mineIronOreAction.id,
      itemId: ironOre.id,
      minQuantity: 1,
      maxQuantity: 2,
      weight: 100,
    },
  });

  // Mining action: Mine Copper Ore
  const mineCopperOreAction = await prisma.skillAction.upsert({
    where: { key: "mine-copper-ore" },
    update: {},
    create: {
      key: "mine-copper-ore",
      name: "Mine Copper Ore",
      description: "Extract copper ore from a mining node.",
      skillId: miningSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 3,
      xpReward: 8,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${mineCopperOreAction.id}-copper-ore` },
    update: {},
    create: {
      id: `${mineCopperOreAction.id}-copper-ore`,
      actionId: mineCopperOreAction.id,
      itemId: copperOre.id,
      minQuantity: 1,
      maxQuantity: 3,
      weight: 100,
    },
  });

  // Fishing skill
  const fishingSkill = await prisma.trainingSkill.upsert({
    where: { key: "fishing" },
    update: {},
    create: {
      key: "fishing",
      name: "Fishing",
      description: "Catch fish from bodies of water.",
      category: "GATHERING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: fisherJob.id,
      tags: ["gathering", "starter"],
    },
  });

  // Fishing action: Catch Fish
  const catchFishAction = await prisma.skillAction.upsert({
    where: { key: "catch-fish" },
    update: {},
    create: {
      key: "catch-fish",
      name: "Catch Fish",
      description: "Cast your line and catch a fish.",
      skillId: fishingSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 4,
      xpReward: 12,
      successRate: 0.9,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${catchFishAction.id}-fish` },
    update: {},
    create: {
      id: `${catchFishAction.id}-fish`,
      actionId: catchFishAction.id,
      itemId: fish.id,
      minQuantity: 1,
      maxQuantity: 2,
      weight: 100,
    },
  });

  // Herbalism skill
  const herbalismSkill = await prisma.trainingSkill.upsert({
    where: { key: "herbalism" },
    update: {},
    create: {
      key: "herbalism",
      name: "Herbalism",
      description: "Gather herbs and plants from nature.",
      category: "GATHERING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: herbalistJob.id,
      tags: ["gathering", "starter"],
    },
  });

  // Herbalism action: Gather Herbs
  const gatherHerbsAction = await prisma.skillAction.upsert({
    where: { key: "gather-herbs" },
    update: {},
    create: {
      key: "gather-herbs",
      name: "Gather Herbs",
      description: "Collect medicinal herbs from a patch.",
      skillId: herbalismSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 2,
      xpReward: 8,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${gatherHerbsAction.id}-herb` },
    update: {},
    create: {
      id: `${gatherHerbsAction.id}-herb`,
      actionId: gatherHerbsAction.id,
      itemId: herb.id,
      minQuantity: 1,
      maxQuantity: 3,
      weight: 100,
    },
  });

  // Logging skill
  const loggingSkill = await prisma.trainingSkill.upsert({
    where: { key: "logging" },
    update: {},
    create: {
      key: "logging",
      name: "Logging",
      description: "Harvest wood from trees.",
      category: "GATHERING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: loggerJob.id,
      tags: ["gathering", "starter"],
    },
  });

  // Logging action: Chop Wood
  const chopWoodAction = await prisma.skillAction.upsert({
    where: { key: "chop-wood" },
    update: {},
    create: {
      key: "chop-wood",
      name: "Chop Wood",
      description: "Harvest wood from a tree.",
      skillId: loggingSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 3,
      xpReward: 9,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${chopWoodAction.id}-wood` },
    update: {},
    create: {
      id: `${chopWoodAction.id}-wood`,
      actionId: chopWoodAction.id,
      itemId: wood.id,
      minQuantity: 1,
      maxQuantity: 2,
      weight: 100,
    },
  });

  // Smithing skill (processing)
  const smithingSkill = await prisma.trainingSkill.upsert({
    where: { key: "smithing" },
    update: {},
    create: {
      key: "smithing",
      name: "Smithing",
      description: "Forge weapons and armor from metal.",
      category: "PROCESSING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: blacksmithJob.id,
      tags: ["processing", "starter"],
    },
  });

  // Smithing action: Smelt Iron Bar
  const smeltIronBarAction = await prisma.skillAction.upsert({
    where: { key: "smelt-iron-bar" },
    update: {},
    create: {
      key: "smelt-iron-bar",
      name: "Smelt Iron Bar",
      description: "Smelt iron ore into a refined iron bar.",
      skillId: smithingSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 5,
      xpReward: 15,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionInput.upsert({
    where: { id: `${smeltIronBarAction.id}-iron-ore` },
    update: {},
    create: {
      id: `${smeltIronBarAction.id}-iron-ore`,
      actionId: smeltIronBarAction.id,
      itemId: ironOre.id,
      quantity: 2,
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${smeltIronBarAction.id}-iron-bar` },
    update: {},
    create: {
      id: `${smeltIronBarAction.id}-iron-bar`,
      actionId: smeltIronBarAction.id,
      itemId: ironBar.id,
      minQuantity: 1,
      maxQuantity: 1,
      weight: 100,
    },
  });

  // Tailoring skill
  const tailoringSkill = await prisma.trainingSkill.upsert({
    where: { key: "tailoring" },
    update: {},
    create: {
      key: "tailoring",
      name: "Tailoring",
      description: "Craft clothing and fabric-based equipment.",
      category: "PROCESSING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: tailorJob.id,
      tags: ["processing", "starter"],
    },
  });

  // Tailoring action: Craft Cloth Shirt
  const craftClothShirtAction = await prisma.skillAction.upsert({
    where: { key: "craft-cloth-shirt" },
    update: {},
    create: {
      key: "craft-cloth-shirt",
      name: "Craft Cloth Shirt",
      description: "Craft a basic cloth shirt from fabric.",
      skillId: tailoringSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 4,
      xpReward: 12,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionInput.upsert({
    where: { id: `${craftClothShirtAction.id}-cloth` },
    update: {},
    create: {
      id: `${craftClothShirtAction.id}-cloth`,
      actionId: craftClothShirtAction.id,
      itemId: cloth.id,
      quantity: 3,
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${craftClothShirtAction.id}-cloth-shirt` },
    update: {},
    create: {
      id: `${craftClothShirtAction.id}-cloth-shirt`,
      actionId: craftClothShirtAction.id,
      itemId: clothShirt.id,
      minQuantity: 1,
      maxQuantity: 1,
      weight: 100,
    },
  });

  // Alchemy skill
  const alchemySkill = await prisma.trainingSkill.upsert({
    where: { key: "alchemy" },
    update: {},
    create: {
      key: "alchemy",
      name: "Alchemy",
      description: "Create potions and magical consumables.",
      category: "PROCESSING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: alchemistJob.id,
      tags: ["processing", "starter"],
    },
  });

  // Alchemy action: Brew Health Potion
  const brewHealthPotionAction = await prisma.skillAction.upsert({
    where: { key: "brew-health-potion" },
    update: {},
    create: {
      key: "brew-health-potion",
      name: "Brew Health Potion",
      description: "Brew a health potion from herbs.",
      skillId: alchemySkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 5,
      xpReward: 15,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionInput.upsert({
    where: { id: `${brewHealthPotionAction.id}-herb` },
    update: {},
    create: {
      id: `${brewHealthPotionAction.id}-herb`,
      actionId: brewHealthPotionAction.id,
      itemId: herb.id,
      quantity: 2,
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${brewHealthPotionAction.id}-health-potion` },
    update: {},
    create: {
      id: `${brewHealthPotionAction.id}-health-potion`,
      actionId: brewHealthPotionAction.id,
      itemId: healthPotion.id,
      minQuantity: 1,
      maxQuantity: 1,
      weight: 100,
    },
  });

  // Cooking skill
  const cookingSkill = await prisma.trainingSkill.upsert({
    where: { key: "cooking" },
    update: {},
    create: {
      key: "cooking",
      name: "Cooking",
      description: "Prepare food items that restore health and stamina.",
      category: "PROCESSING",
      status: "ACTIVE",
      maxLevel: 99,
      xpCurveBase: 1.15,
      jobId: cookJob.id,
      tags: ["processing", "starter"],
    },
  });

  // Cooking action: Cook Fish
  const cookFishAction = await prisma.skillAction.upsert({
    where: { key: "cook-fish" },
    update: {},
    create: {
      key: "cook-fish",
      name: "Cook Fish",
      description: "Cook a fresh fish into a meal.",
      skillId: cookingSkill.id,
      requiredLevel: 1,
      actionTimeSeconds: 3,
      xpReward: 10,
      successRate: 1.0,
      staminaCost: 0,
      status: "ACTIVE",
      tags: ["tier1", "starter"],
    },
  });

  await prisma.skillActionInput.upsert({
    where: { id: `${cookFishAction.id}-fish` },
    update: {},
    create: {
      id: `${cookFishAction.id}-fish`,
      actionId: cookFishAction.id,
      itemId: fish.id,
      quantity: 1,
    },
  });

  await prisma.skillActionOutput.upsert({
    where: { id: `${cookFishAction.id}-cooked-fish` },
    update: {},
    create: {
      id: `${cookFishAction.id}-cooked-fish`,
      actionId: cookFishAction.id,
      itemId: cookedFish.id,
      minQuantity: 1,
      maxQuantity: 1,
      weight: 100,
    },
  });

  console.log("✅ Training skills created");

  // Create versioned map system sample data
  console.log("Creating versioned map system sample data...");

  const starterPlainsMap = await prisma.mapDefinition.upsert({
    where: { slug: "starter-plains" },
    update: {},
    create: {
      name: "Starter Plains",
      slug: "starter-plains",
      description: "A peaceful starting area for new adventurers",
      biome: "Plains",
      recommendedMinLevel: 1,
      recommendedMaxLevel: 5,
      dangerRating: 1,
    },
  });

  // Create draft version 1 (25x25)
  let mapVersion1 = await prisma.mapVersion.findFirst({
    where: {
      mapId: starterPlainsMap.id,
      versionNumber: 1,
    },
  });

  if (!mapVersion1) {
    mapVersion1 = await prisma.mapVersion.create({
      data: {
        mapId: starterPlainsMap.id,
        versionNumber: 1,
        status: "DRAFT",
        width: 25,
        height: 25,
        changeNotes: "Initial draft version",
      },
    });
  }

  // Generate tiles for all cells (25x25 = 625 tiles)
  const mapTiles: Array<{
    mapVersionId: string;
    x: number;
    y: number;
    tileType: "GROUND";
    overlay: "NONE";
    isWalkable: boolean;
    movementCost: number;
    safeZone: boolean;
    fogDiscoverable: boolean;
  }> = [];

  for (let y = 0; y < 25; y++) {
    for (let x = 0; x < 25; x++) {
      mapTiles.push({
        mapVersionId: mapVersion1.id,
        x,
        y,
        tileType: "GROUND",
        overlay: "NONE",
        isWalkable: true,
        movementCost: 1,
        safeZone: x >= 10 && x <= 14 && y >= 10 && y <= 14, // Center 5x5 is safe
        fogDiscoverable: true,
      });
    }
  }

  // Batch create tiles
  const mapTileChunkSize = 100;
  for (let i = 0; i < mapTiles.length; i += mapTileChunkSize) {
    const chunk = mapTiles.slice(i, i + mapTileChunkSize);
    await prisma.mapVersionTile.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  console.log(`✅ Created ${mapTiles.length} tiles for Starter Plains map`);

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
