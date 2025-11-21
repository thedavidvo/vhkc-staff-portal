/**
 * Migration Script: Add mobile_number column to drivers table
 * 
 * This script adds the mobile_number column to the existing drivers table.
 * Run with: npm run migrate-add-mobile
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to add mobile_number column to drivers table...\n');
    
    // Check if column already exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'drivers' AND column_name = 'mobile_number'
    ` as any[];
    
    if (columnCheck.length > 0) {
      console.log('✓ mobile_number column already exists in drivers table, skipping...');
    } else {
      console.log('Adding mobile_number column to drivers table...');
      try {
        await sql`
          ALTER TABLE drivers 
          ADD COLUMN mobile_number TEXT
        `;
        console.log('✓ Added mobile_number column to drivers table');
      } catch (error: any) {
        // If column already exists (race condition), that's okay
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log('✓ mobile_number column already exists (race condition), skipping...');
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe drivers table now includes:');
    console.log('  - mobile_number (TEXT, optional)');
    
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

