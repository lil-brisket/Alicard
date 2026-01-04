import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Applying gathering node migration...");
  
  // Read the migration SQL file
  const migrationPath = join(
    __dirname,
    "../prisma/migrations/20260104005605_add_gathering_node_tier_fields/migration.sql"
  );
  const migrationSQL = readFileSync(migrationPath, "utf-8");
  
  // Execute the migration
  await pool.query(migrationSQL);
  
  console.log("✅ Migration applied successfully!");
  console.log("Now run: npx prisma generate");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

