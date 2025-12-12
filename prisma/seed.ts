import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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
      itemType: "ARMOR",
      itemRarity: "COMMON",
      tier: 1,
      value: 30,
      stackable: false,
      maxStack: 1,
      equipmentSlot: "CHEST",
      vitalityBonus: 1,
    },
  });

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
