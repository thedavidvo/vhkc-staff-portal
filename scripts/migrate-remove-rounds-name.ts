/**
 * Migration Script: Remove name column from rounds table
 * 
 * This script removes the name column from the rounds table as it's no longer being used.
 * Run with: npm run migrate-remove-rounds-name
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to remove name column from rounds table...\n');
    
    // Check if name column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rounds' AND column_name = 'name'
    ` as any[];
    
    if (columnCheck.length > 0) {
      console.log('Removing name column from rounds table...');
      await sql`
        ALTER TABLE rounds 
        DROP COLUMN name
      `;
      console.log('✓ Removed name column from rounds table');
    } else {
      console.log('✓ name column does not exist in rounds table');
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe rounds table no longer includes the name column.');
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => {
    console.log('\nMigration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

