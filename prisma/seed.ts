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
      equipmentSlot: "LEFT_ARM",
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
      equipmentSlot: "RIGHT_ARM",
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
      name: "Basic Attack",
      description: "A simple melee attack.",
      staminaCost: 5,
      cooldownSeconds: 0,
    },
  });

  const powerStrike = await prisma.skill.upsert({
    where: { id: "power-strike" },
    update: {},
    create: {
      id: "power-strike",
      key: "power-strike",
      name: "Power Strike",
      description: "A powerful attack that deals extra damage.",
      staminaCost: 15,
      cooldownSeconds: 3,
    },
  });

  const heal = await prisma.skill.upsert({
    where: { id: "heal" },
    update: {},
    create: {
      id: "heal",
      key: "heal",
      name: "Heal",
      description: "Restores a small amount of health.",
      staminaCost: 10,
      cooldownSeconds: 5,
    },
  });

  const dodge = await prisma.skill.upsert({
    where: { id: "dodge" },
    update: {},
    create: {
      id: "dodge",
      key: "dodge",
      name: "Dodge",
      description: "Increases evasion for a short time.",
      staminaCost: 8,
      cooldownSeconds: 10,
    },
  });

  const shieldBash = await prisma.skill.upsert({
    where: { id: "shield-bash" },
    update: {},
    create: {
      id: "shield-bash",
      key: "shield-bash",
      name: "Shield Bash",
      description: "Bash with your shield, stunning the enemy.",
      staminaCost: 12,
      cooldownSeconds: 8,
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

  // Mining nodes
  const ironMine = await prisma.gatheringNode.upsert({
    where: { key: "iron-mine-1" },
    update: {},
    create: {
      key: "iron-mine-1",
      name: "Iron Mine",
      description: "A rich vein of iron ore.",
      jobId: minerJob.id,
      dangerTier: 2,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${ironMine.id}-iron-ore` },
    update: {},
    create: {
      id: `${ironMine.id}-iron-ore`,
      nodeId: ironMine.id,
      itemId: ironOre.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  const copperMine = await prisma.gatheringNode.upsert({
    where: { key: "copper-mine-1" },
    update: {},
    create: {
      key: "copper-mine-1",
      name: "Copper Mine",
      description: "A vein of copper ore.",
      jobId: minerJob.id,
      dangerTier: 1,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${copperMine.id}-copper-ore` },
    update: {},
    create: {
      id: `${copperMine.id}-copper-ore`,
      nodeId: copperMine.id,
      itemId: copperOre.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  // Fishing spots
  const fishingSpot = await prisma.gatheringNode.upsert({
    where: { key: "fishing-spot-1" },
    update: {},
    create: {
      key: "fishing-spot-1",
      name: "Fishing Spot",
      description: "A quiet spot by the water.",
      jobId: fisherJob.id,
      dangerTier: 1,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${fishingSpot.id}-fish` },
    update: {},
    create: {
      id: `${fishingSpot.id}-fish`,
      nodeId: fishingSpot.id,
      itemId: fish.id,
      minQty: 1,
      maxQty: 2,
      weight: 100,
    },
  });

  // Herbalist nodes
  const herbPatch = await prisma.gatheringNode.upsert({
    where: { key: "herb-patch-1" },
    update: {},
    create: {
      key: "herb-patch-1",
      name: "Herb Patch",
      description: "A patch of wild herbs.",
      jobId: herbalistJob.id,
      dangerTier: 1,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${herbPatch.id}-herb` },
    update: {},
    create: {
      id: `${herbPatch.id}-herb`,
      nodeId: herbPatch.id,
      itemId: herb.id,
      minQty: 1,
      maxQty: 3,
      weight: 100,
    },
  });

  // Logger nodes
  const tree = await prisma.gatheringNode.upsert({
    where: { key: "tree-1" },
    update: {},
    create: {
      key: "tree-1",
      name: "Tree",
      description: "A mature tree ready for harvesting.",
      jobId: loggerJob.id,
      dangerTier: 1,
    },
  });

  await prisma.nodeYield.upsert({
    where: { id: `${tree.id}-wood` },
    update: {},
    create: {
      id: `${tree.id}-wood`,
      nodeId: tree.id,
      itemId: wood.id,
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
  const questTemplate1 = await prisma.questTemplate.create({
    data: {
      name: "Slay the Goblin",
      title: "Slay the Goblin",
      description: "Defeat 5 goblins in the forest",
      status: "ACTIVE",
      tags: ["kill", "starter"],
      stepsJSON: [
        { type: "KILL", target: "goblin", count: 5 },
        { type: "RETURN", npc: "quest-giver" },
      ],
      rewardsJSON: {
        gold: 100,
        xp: 200,
        items: [{ id: "health-potion", qty: 3 }],
      },
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
