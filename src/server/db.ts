import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let pool: Pool | undefined;

const createPrismaClient = () => {
  try {
    // Create connection pool
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
    
    // Create adapter
    const adapter = new PrismaPg(pool);

    // Create Prisma client with adapter
    const client = new PrismaClient({
      adapter,
      log:
        env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

    // Verify client is created and has expected structure
    if (!client || typeof client !== "object") {
      throw new Error("Failed to create Prisma client");
    }

    // Test that models are accessible (Prisma uses Proxy, so we can't use 'in' operator)
    // But we can verify the client has the expected structure
    if (typeof client.$connect !== "function") {
      throw new Error("Prisma client is missing expected methods");
    }

    return client;
  } catch (error) {
    console.error("Error creating Prisma client:", error);
    throw error;
  }
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Cleanup function to close the connection pool on shutdown
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    if (pool) {
      await pool.end();
    }
    await db.$disconnect();
  });
}
