#!/usr/bin/env node
/**
 * Force release Prisma advisory locks by terminating all connections holding them
 */

import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not found in environment');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function forceReleaseLocks() {
  try {
    console.log('🔍 Finding processes holding Prisma migration lock (ID: 72707369)...');
    
    // Find all processes holding the advisory lock
    const lockResult = await pool.query(`
      SELECT 
        l.pid,
        a.usename,
        a.application_name,
        a.state,
        a.query_start
      FROM pg_locks l
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.locktype = 'advisory' 
      AND l.objid = 72707369
      ORDER BY l.granted DESC;
    `);
    
    if (lockResult.rows.length === 0) {
      console.log('✅ No processes holding the lock!');
      await pool.query('SELECT pg_advisory_unlock_all()');
      console.log('✅ Released all advisory locks');
      return;
    }
    
    console.log(`\n⚠️  Found ${lockResult.rows.length} process(es) holding the lock:`);
    console.table(lockResult.rows.map(row => ({
      pid: row.pid,
      user: row.usename,
      app: row.application_name || 'N/A',
      state: row.state,
      started: row.query_start ? new Date(row.query_start).toLocaleString() : 'N/A',
    })));
    
    console.log('\n🔧 Terminating all connections holding the lock...');
    
    // Terminate all processes holding the lock
    for (const row of lockResult.rows) {
      if (row.pid) {
        try {
          await pool.query(`SELECT pg_terminate_backend(${row.pid})`);
          console.log(`  ✓ Terminated PID ${row.pid}`);
        } catch (err) {
          console.log(`  ⚠ Could not terminate PID ${row.pid}: ${err.message}`);
        }
      }
    }
    
    // Wait a moment for connections to close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Release all advisory locks
    await pool.query('SELECT pg_advisory_unlock_all()');
    console.log('\n✅ Released all advisory locks');
    
    // Verify no locks remain
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_locks 
      WHERE locktype = 'advisory' 
      AND objid = 72707369;
    `);
    
    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('✅ Lock successfully released! You can now run migrations.');
    } else {
      console.log('⚠️  Some locks may still remain. Try waiting a few seconds and running the migration again.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceReleaseLocks();
