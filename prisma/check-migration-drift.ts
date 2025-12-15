#!/usr/bin/env tsx
/**
 * Migration Drift Checker
 * 
 * This script verifies that the database schema is in sync with migration history.
 * Run this before committing schema changes to catch drift early.
 * 
 * Usage: npm run db:check
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

console.log("🔍 Checking for migration drift...\n");

try {
  // Check if migrations are in sync
  const output = execSync("npx prisma migrate status", {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (output.includes("Database schema is up to date")) {
    console.log("✅ Database schema is in sync with migration history\n");
    process.exit(0);
  } else if (output.includes("drift")) {
    console.error("❌ MIGRATION DRIFT DETECTED!\n");
    console.error("The database schema does not match the migration history.\n");
    console.error("This usually happens when:");
    console.error("  - Someone used 'prisma db push' instead of migrations");
    console.error("  - Manual database changes were made");
    console.error("  - Migrations were applied out of order\n");
    console.error("To fix this:");
    console.error("  1. Review the drift details above");
    console.error("  2. Create a new migration: npm run db:generate");
    console.error("  3. If in development, you may need to reset: npx prisma migrate reset\n");
    console.error("Full output:");
    console.error(output);
    process.exit(1);
  } else {
    console.log("⚠️  Migration status check returned unexpected output:");
    console.log(output);
    process.exit(1);
  }
} catch (error: unknown) {
  const err = error as { stdout?: string; stderr?: string; status?: number };
  
  if (err.stdout) {
    const output = err.stdout.toString();
    
    if (output.includes("drift")) {
      console.error("❌ MIGRATION DRIFT DETECTED!\n");
      console.error("The database schema does not match the migration history.\n");
      console.error("This usually happens when:");
      console.error("  - Someone used 'prisma db push' instead of migrations");
      console.error("  - Manual database changes were made");
      console.error("  - Migrations were applied out of order\n");
      console.error("To fix this:");
      console.error("  1. Review the drift details above");
      console.error("  2. Create a new migration: npm run db:generate");
      console.error("  3. If in development, you may need to reset: npx prisma migrate reset\n");
      console.error("Full output:");
      console.error(output);
      process.exit(1);
    } else {
      console.error("❌ Error checking migration status:");
      console.error(output);
      if (err.stderr) {
        console.error(err.stderr.toString());
      }
      process.exit(1);
    }
  } else {
    console.error("❌ Failed to check migration status:");
    console.error(err);
    process.exit(1);
  }
}
