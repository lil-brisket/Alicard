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

  // Blacksmith: Iron Ore -> Iron Bar
  const ironBarRecipe = await prisma.recipe.upsert({
    where: { id: "iron-bar-recipe" },
    update: {},
    create: {
      id: "iron-bar-recipe",
      jobId: blacksmithJob.id,
      name: "Iron Bar",
      description: "Smelt iron ore into a refined iron bar.",
      difficulty: 2,
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

  // Alchemist: Herb -> Health Potion
  const healthPotionRecipe = await prisma.recipe.upsert({
    where: { id: "health-potion-recipe" },
    update: {},
    create: {
      id: "health-potion-recipe",
      jobId: alchemistJob.id,
      name: "Health Potion",
      description: "Brew a health potion from herbs.",
      difficulty: 3,
      outputItemId: healthPotion.id,
      outputQty: 1,
    },
  });

  await prisma.recipeInput.upsert({
    where: { id: `${healthPotionRecipe.id}-herb` },
    update: {},
    create: {
      id: `${healthPotionRecipe.id}-herb`,
      recipeId: healthPotionRecipe.id,
      itemId: herb.id,
      qty: 2,
    },
  });

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
