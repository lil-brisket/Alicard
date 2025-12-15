#!/usr/bin/env tsx
/**
 * Test Database Connection
 * 
 * This script helps you verify and update your DATABASE_URL
 * Run this to test if Prisma can connect to your database
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in .env file");
  process.exit(1);
}

console.log("🔍 Testing database connection...\n");
console.log(`Connection string: ${dbUrl.replace(/:[^:@]+@/, ":****@")}\n`);

// Extract connection info
const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (match) {
  console.log("Connection details:");
  console.log(`  Host: ${match[3]}`);
  console.log(`  Port: ${match[4]}`);
  console.log(`  User: ${match[1]}`);
  console.log(`  Database: ${match[5]}\n`);
} else {
  console.error("❌ Invalid DATABASE_URL format");
  console.error("Expected format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
});

try {
  const client = await pool.connect();
  console.log("✅ Successfully connected to database!\n");
  
  // Try a simple query
  const result = await client.query("SELECT version()");
  console.log("Database version:", result.rows[0]?.version || "Unknown");
  
  // Check if database exists
  const dbCheck = await client.query(
    "SELECT datname FROM pg_database WHERE datname = $1",
    [match[5]]
  );
  
  if (dbCheck.rows.length > 0) {
    console.log(`✅ Database "${match[5]}" exists\n`);
  } else {
    console.log(`⚠️  Database "${match[5]}" does not exist\n`);
    console.log("Create it with: CREATE DATABASE \"Alicard\";\n");
  }
  
  client.release();
  await pool.end();
  console.log("✅ Connection test passed! Your DATABASE_URL is correct.\n");
  process.exit(0);
} catch (error: any) {
  console.error("❌ Failed to connect to database:\n");
  console.error(error.message);
  
  if (error.code === "ECONNREFUSED" || error.message.includes("connect")) {
    console.error("\n💡 Connection refused. This usually means:");
    console.error("  1. The database server is not running");
    console.error("  2. The host/port is incorrect");
    console.error("  3. Firewall is blocking the connection\n");
    console.error("To fix:");
    console.error("  1. Check pgAdmin4 for the correct connection details");
    console.error("  2. Update DATABASE_URL in .env with the correct values");
    console.error("  3. Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE\n");
  } else if (error.code === "28P01" || error.message.includes("password authentication")) {
    console.error("\n💡 Authentication failed. Check:");
    console.error("  1. Username is correct");
    console.error("  2. Password is correct");
    console.error("  3. User has permission to access the database\n");
  } else if (error.code === "3D000" || error.message.includes("does not exist")) {
    console.error("\n💡 Database does not exist. Create it with:");
    console.error(`  CREATE DATABASE "${match[5]}";\n`);
  }
  
  await pool.end();
  process.exit(1);
}
