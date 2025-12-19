#!/usr/bin/env node
/**
 * Force release Prisma advisory lock
 * This script attempts to release the specific Prisma migration lock
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Prisma migration lock ID
const LOCK_ID = 72707369;

async function forceReleaseLock() {
  try {
    console.log('Attempting to force release Prisma migration lock...');
    console.log(`Lock ID: ${LOCK_ID}\n`);
    
    // Get all sessions and their locks
    const locksResult = await pool.query(`
      SELECT 
        pid,
        locktype,
        objid,
        mode,
        granted
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND objid = ${LOCK_ID};
    `);
    
    if (locksResult.rows.length > 0) {
      console.log('Found advisory locks:');
      console.table(locksResult.rows);
      
      // Try to terminate each process holding the lock
      for (const lock of locksResult.rows) {
        if (lock.pid) {
          try {
            console.log(`\nAttempting to terminate PID ${lock.pid}...`);
            await pool.query(`SELECT pg_terminate_backend(${lock.pid})`);
            console.log(`✓ Terminated PID ${lock.pid}`);
          } catch (err) {
            console.log(`⚠ Error terminating PID ${lock.pid}: ${err.message}`);
          }
        }
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to release the lock directly (this only works if we hold it)
      try {
        const releaseResult = await pool.query(`SELECT pg_advisory_unlock(${LOCK_ID})`);
        if (releaseResult.rows[0]?.pg_advisory_unlock) {
          console.log(`\n✓ Successfully released lock ${LOCK_ID}`);
        } else {
          console.log(`\n⚠ Could not release lock ${LOCK_ID} (we don't hold it)`);
        }
      } catch (err) {
        console.log(`\n⚠ Could not release lock directly: ${err.message}`);
      }
    } else {
      console.log('No advisory locks found for this ID');
    }
    
    // Check for any remaining Prisma connections
    const connectionsResult = await pool.query(`
      SELECT pid, usename, application_name, state, query
      FROM pg_stat_activity
      WHERE pid IN (
        SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = ${LOCK_ID}
      );
    `);
    
    if (connectionsResult.rows.length > 0) {
      console.log('\n⚠ Remaining connections holding locks:');
      console.table(connectionsResult.rows.map(row => ({
        pid: row.pid,
        user: row.usename,
        app: row.application_name || 'N/A',
        state: row.state,
      })));
    }
    
    console.log('\n✅ Lock release attempt complete.');
    console.log('💡 If the lock persists, try:');
    console.log('   1. Wait 10-15 seconds and try the migration again');
    console.log('   2. Restart your PostgreSQL server');
    console.log('   3. Check for any running Prisma Studio or other Prisma processes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceReleaseLock();
