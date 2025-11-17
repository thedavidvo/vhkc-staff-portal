import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to remove unused fields from drivers table...');
    
    // Drop columns if they exist (PostgreSQL 9.0+ supports IF EXISTS)
    console.log('Dropping last_race_position column...');
    try {
      await sql`ALTER TABLE drivers DROP COLUMN IF EXISTS last_race_position`;
      console.log('✓ Dropped last_race_position column (or it did not exist)');
    } catch (error: any) {
      console.log(`  - Warning: ${error.message}`);
    }
    
    console.log('Dropping fastest_lap column...');
    try {
      await sql`ALTER TABLE drivers DROP COLUMN IF EXISTS fastest_lap`;
      console.log('✓ Dropped fastest_lap column (or it did not exist)');
    } catch (error: any) {
      console.log(`  - Warning: ${error.message}`);
    }
    
    console.log('Dropping points_total column...');
    try {
      await sql`ALTER TABLE drivers DROP COLUMN IF EXISTS points_total`;
      console.log('✓ Dropped points_total column (or it did not exist)');
    } catch (error: any) {
      console.log(`  - Warning: ${error.message}`);
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe following columns have been removed from the drivers table:');
    console.log('  - last_race_position');
    console.log('  - fastest_lap');
    console.log('  - points_total');
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

