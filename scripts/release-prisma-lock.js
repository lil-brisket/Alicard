#!/usr/bin/env node
/**
 * Script to release Prisma advisory locks
 * This helps when migrations timeout due to advisory locks
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

async function releaseLocks() {
  try {
    console.log('Connecting to database...');
    
    // Release all advisory locks for this session
    const releaseResult = await pool.query('SELECT pg_advisory_unlock_all()');
    console.log('✓ Released all advisory locks');
    
    // Check for any Prisma-related connections
    const checkResult = await pool.query(`
      SELECT 
        pid, 
        usename, 
        application_name, 
        state, 
        query_start,
        state_change
      FROM pg_stat_activity 
      WHERE application_name LIKE '%prisma%' 
         OR application_name LIKE '%migrate%'
         OR query LIKE '%prisma%'
      ORDER BY query_start DESC;
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('\n⚠ Found Prisma-related connections:');
      console.table(checkResult.rows.map(row => ({
        pid: row.pid,
        user: row.usename,
        app: row.application_name || 'N/A',
        state: row.state,
        started: row.query_start ? new Date(row.query_start).toLocaleString() : 'N/A',
      })));
      
      // Try to terminate connections that might be holding locks
      console.log('\n🔧 Attempting to terminate connections that may be holding locks...');
      for (const row of checkResult.rows) {
        if (row.pid && row.state === 'active') {
          try {
            await pool.query(`SELECT pg_terminate_backend(${row.pid})`);
            console.log(`  ✓ Terminated connection PID ${row.pid}`);
          } catch (err) {
            console.log(`  ⚠ Could not terminate PID ${row.pid}: ${err.message}`);
          }
        }
      }
      
      // Release locks again after terminating connections
      await pool.query('SELECT pg_advisory_unlock_all()');
      console.log('✓ Released advisory locks again');
      
      console.log('\n💡 If issues persist, you may need to:');
      console.log('   1. Close Prisma Studio if it\'s running');
      console.log('   2. Restart your database server');
      console.log('   3. Wait a few seconds and try the migration again');
    } else {
      console.log('✓ No active Prisma connections found');
    }
    
    console.log('\n✅ Lock release complete! You can now run migrations.');
    
  } catch (error) {
    console.error('❌ Error releasing locks:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

releaseLocks();
