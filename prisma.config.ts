import { defineConfig } from "prisma/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env file manually if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const envFile = readFileSync(envPath, "utf-8");
    const envLines = envFile.split("\n");
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key?.trim() === "DATABASE_URL" && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          process.env.DATABASE_URL = value;
          break;
        }
      }
    }
  } catch (error) {
    // .env file might not exist or be readable, that's okay
  }
}

// DATABASE_URL is required for migrations and runtime
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl === "postgresql://placeholder") {
  throw new Error(
    "DATABASE_URL is not set in your .env file. Please add it before running migrations.\n" +
    "Example: DATABASE_URL=\"postgresql://postgres:password@localhost:5432/alicard?schema=public\""
  );
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});

