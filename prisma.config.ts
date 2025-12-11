import { defineConfig } from "prisma/config";

// DATABASE_URL is required for migrations and runtime, but may be optional during generation
const databaseUrl = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: databaseUrl || "postgresql://placeholder", // Placeholder for generation, actual URL required at runtime
  },
});

