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
  console.log("🔄 Updating existing players with Equipment and PlayerSkillLoadout records...");

  // Get all players without Equipment records
  const playersWithoutEquipment = await prisma.player.findMany({
    where: {
      equipment: null,
      isDeleted: false,
    },
    select: { id: true },
  });

  console.log(`Found ${playersWithoutEquipment.length} players without Equipment records`);

  for (const player of playersWithoutEquipment) {
    await prisma.equipment.create({
      data: { playerId: player.id },
    });
  }

  // Get all players without PlayerSkillLoadout records
  const playersWithoutLoadout = await prisma.player.findMany({
    where: {
      skillLoadout: null,
      isDeleted: false,
    },
    select: { id: true },
  });

  console.log(`Found ${playersWithoutLoadout.length} players without PlayerSkillLoadout records`);

  for (const player of playersWithoutLoadout) {
    await prisma.playerSkillLoadout.create({
      data: { playerId: player.id },
    });
  }

  console.log("✅ All existing players have been updated!");
}

main()
  .catch((e) => {
    console.error("❌ Update failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
