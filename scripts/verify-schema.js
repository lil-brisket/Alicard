#!/usr/bin/env node
/**
 * Verify database schema matches Prisma schema
 * Checks if TrainingSkill table has jobId column and relation
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

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema...\n');
    
    // Check if TrainingSkill table exists and has jobId column
    const trainingSkillCheck = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TrainingSkill'
        AND column_name = 'jobId';
    `);
    
    if (trainingSkillCheck.rows.length === 0) {
      console.log('❌ TrainingSkill table does NOT have jobId column');
      console.log('   The migration may not have been applied correctly.\n');
    } else {
      const column = trainingSkillCheck.rows[0];
      console.log('✅ TrainingSkill table has jobId column:');
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log(`   Default: ${column.column_default || 'NULL'}\n`);
    }
    
    // Check for foreign key constraint
    const fkCheck = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'TrainingSkill'
        AND kcu.column_name = 'jobId';
    `);
    
    if (fkCheck.rows.length === 0) {
      console.log('❌ No foreign key constraint found for TrainingSkill.jobId -> Job.id');
      console.log('   The relation may not have been created.\n');
    } else {
      const fk = fkCheck.rows[0];
      console.log('✅ Foreign key constraint found:');
      console.log(`   Constraint: ${fk.constraint_name}`);
      console.log(`   TrainingSkill.jobId -> ${fk.foreign_table_name}.${fk.foreign_column_name}\n`);
    }
    
    // Check for index on jobId
    const indexCheck = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'TrainingSkill'
        AND indexdef LIKE '%jobId%';
    `);
    
    if (indexCheck.rows.length === 0) {
      console.log('⚠️  No index found on TrainingSkill.jobId');
      console.log('   This may affect query performance.\n');
    } else {
      console.log('✅ Index found on jobId:');
      indexCheck.rows.forEach(idx => {
        console.log(`   ${idx.indexname}: ${idx.indexdef}`);
      });
      console.log();
    }
    
    // Check Job table has trainingSkills relation (reverse check)
    const jobRelationCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'TrainingSkill'
        AND constraint_name LIKE '%Job%';
    `);
    
    console.log('📊 Summary:');
    console.log(`   TrainingSkill.jobId column: ${trainingSkillCheck.rows.length > 0 ? '✅ Exists' : '❌ Missing'}`);
    console.log(`   Foreign key constraint: ${fkCheck.rows.length > 0 ? '✅ Exists' : '❌ Missing'}`);
    console.log(`   Index on jobId: ${indexCheck.rows.length > 0 ? '✅ Exists' : '⚠️  Missing'}`);
    
    if (trainingSkillCheck.rows.length > 0 && fkCheck.rows.length > 0) {
      console.log('\n✅ Schema is correctly set up! The migration was applied successfully.');
    } else {
      console.log('\n❌ Schema is incomplete. You may need to run the migration again.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
