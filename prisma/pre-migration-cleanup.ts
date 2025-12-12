/**
 * Pre-migration script to clean up duplicate data before applying unique constraints.
 * 
 * This script should be run BEFORE applying the migration that adds:
 * - @@unique([playerId, itemId]) on InventoryItem
 * - @@unique([key]) on Item
 * 
 * Run with: npx tsx prisma/pre-migration-cleanup.ts
 */

import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanupInventoryDuplicates() {
  console.log("🔍 Checking for duplicate InventoryItem records...");

  // Find duplicates using raw SQL
  const duplicates = await pool.query(`
    SELECT "playerId", "itemId", COUNT(*) as count
    FROM "InventoryItem"
    GROUP BY "playerId", "itemId"
    HAVING COUNT(*) > 1
  `);

  if (duplicates.rows.length === 0) {
    console.log("✅ No duplicate InventoryItem records found.");
    return;
  }

  console.log(`⚠️  Found ${duplicates.rows.length} duplicate InventoryItem groups.`);
  console.log("Merging duplicates by summing quantities...");

  for (const dup of duplicates.rows) {
    const { playerId, itemId } = dup;

    // Get all duplicate records
    const items = await prisma.inventoryItem.findMany({
      where: {
        playerId,
        itemId,
      },
      orderBy: { createdAt: "asc" },
    });

    if (items.length <= 1) continue;

    // Sum quantities
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // Keep the oldest record, delete the rest
    const [keep, ...toDelete] = items;

    console.log(
      `  Merging ${items.length} records for player ${playerId.substring(0, 8)}... item ${itemId.substring(0, 8)}... (total qty: ${totalQuantity})`
    );

    // Update the kept record with total quantity
    await prisma.inventoryItem.update({
      where: { id: keep.id },
      data: { quantity: totalQuantity },
    });

    // Delete duplicates
    await prisma.inventoryItem.deleteMany({
      where: {
        id: { in: toDelete.map((i) => i.id) },
      },
    });
  }

  console.log("✅ InventoryItem duplicates merged.");
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  return result.rows.length > 0;
}

async function cleanupItemKeyDuplicates() {
  console.log("🔍 Checking for duplicate Item keys...");

  // Check if the 'key' column exists (it might not if migration hasn't run yet)
  const keyColumnExists = await checkColumnExists("Item", "key");
  
  if (!keyColumnExists) {
    console.log("ℹ️  'key' column doesn't exist yet. Skipping key duplicate check.");
    console.log("    (This is normal - the migration will add the column)");
    return;
  }

  // Find items with duplicate keys (non-null)
  const duplicates = await pool.query(`
    SELECT "key", COUNT(*) as count
    FROM "Item"
    WHERE "key" IS NOT NULL
    GROUP BY "key"
    HAVING COUNT(*) > 1
  `);

  if (duplicates.rows.length === 0) {
    console.log("✅ No duplicate Item keys found.");
    return;
  }

  console.log(`⚠️  Found ${duplicates.rows.length} duplicate Item keys.`);
  console.log("Setting duplicate keys to NULL (they will need manual assignment)...");

  for (const dup of duplicates.rows) {
    const { key } = dup;

    // Get all items with this key
    const items = await prisma.item.findMany({
      where: { key },
      orderBy: { createdAt: "asc" },
    });

    if (items.length <= 1) continue;

    // Keep the oldest item's key, null out the rest
    const [keep, ...toNull] = items;

    console.log(
      `  Keeping key "${key}" for item ${keep.id.substring(0, 8)}..., nulling ${toNull.length} others`
    );

    // Null out duplicate keys
    await prisma.item.updateMany({
      where: {
        id: { in: toNull.map((i) => i.id) },
      },
      data: { key: null },
    });
  }

  console.log("✅ Item key duplicates cleaned.");
}

async function main() {
  console.log("🧹 Starting pre-migration cleanup...\n");

  try {
    await cleanupInventoryDuplicates();
    console.log("");
    await cleanupItemKeyDuplicates();
    console.log("\n✅ Pre-migration cleanup completed!");
    console.log("You can now safely run: npm run db:generate");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
