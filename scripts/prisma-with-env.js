#!/usr/bin/env node
/**
 * Wrapper script to ensure DATABASE_URL is loaded before running Prisma commands
 * This fixes Prisma 7's issue with reading .env files for migration commands
 */

import { config } from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";

// Load .env file explicitly
config({ path: resolve(process.cwd(), ".env") });

// Get the DATABASE_URL
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in .env file");
  process.exit(1);
}

// Set it explicitly in the environment
process.env.DATABASE_URL = dbUrl;

// Get the Prisma command and arguments from process.argv
const prismaCommand = process.argv.slice(2).join(" ");

if (!prismaCommand) {
  console.error("❌ No Prisma command provided");
  process.exit(1);
}

try {
  // Ensure DATABASE_URL is set in the current process
  process.env.DATABASE_URL = dbUrl;
  
  // Also set it explicitly for the child process
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
  };
  
  // Run the Prisma command
  execSync(`npx prisma ${prismaCommand}`, {
    stdio: "inherit",
    env: env,
    shell: true,
  });
} catch (error) {
  console.error(`\n❌ Prisma command failed`);
  process.exit(1);
}
