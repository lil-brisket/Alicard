import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let pool: Pool | undefined;

const createPrismaClient = () => {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Cleanup function to close the connection pool on shutdown
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    if (pool) {
      await pool.end();
    }
    await db.$disconnect();
  });
}
