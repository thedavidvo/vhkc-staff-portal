/**
 * Migration Script: Update rounds table to use location_id instead of location and remove address
 * 
 * This script:
 * 1. Adds location_id column to rounds table
 * 2. Migrates existing location names to location_ids by matching with locations table
 * 3. Removes address column from rounds table
 * Run with: npm run migrate-rounds-location-id
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to update rounds table with location_id...\n');
    
    // Step 1: Check if location_id column already exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rounds' AND column_name = 'location_id'
    ` as any[];
    
    if (columnCheck.length === 0) {
      console.log('Adding location_id column to rounds table...');
      await sql`
        ALTER TABLE rounds 
        ADD COLUMN location_id TEXT
      `;
      console.log('✓ Added location_id column to rounds table');
    } else {
      console.log('✓ location_id column already exists in rounds table');
    }
    
    // Step 2: Migrate existing location names to location_ids
    console.log('\nMigrating existing location names to location_ids...');
    const locations = await sql`SELECT id, name FROM locations` as any[];
    const locationMap = new Map<string, string>();
    locations.forEach(loc => {
      locationMap.set(loc.name?.toLowerCase().trim(), loc.id);
    });
    
    const rounds = await sql`SELECT id, location FROM rounds WHERE location IS NOT NULL AND location != ''` as any[];
    let migratedCount = 0;
    let notFoundCount = 0;
    
    for (const round of rounds) {
      const locationName = round.location?.trim();
      if (locationName) {
        const locationId = locationMap.get(locationName.toLowerCase());
        if (locationId) {
          await sql`
            UPDATE rounds 
            SET location_id = ${locationId}
            WHERE id = ${round.id} AND (location_id IS NULL OR location_id = '')
          `;
          migratedCount++;
        } else {
          console.log(`  ⚠ Warning: Location "${locationName}" not found in locations table for round ${round.id}`);
          notFoundCount++;
        }
      }
    }
    
    console.log(`✓ Migrated ${migratedCount} rounds to use location_id`);
    if (notFoundCount > 0) {
      console.log(`  ⚠ ${notFoundCount} rounds had locations that couldn't be matched`);
    }
    
    // Step 3: Remove address column if it exists
    const addressColumnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rounds' AND column_name = 'address'
    ` as any[];
    
    if (addressColumnCheck.length > 0) {
      console.log('\nRemoving address column from rounds table...');
      await sql`
        ALTER TABLE rounds 
        DROP COLUMN address
      `;
      console.log('✓ Removed address column from rounds table');
    } else {
      console.log('\n✓ address column does not exist in rounds table');
    }
    
    // Optional: Remove location column (keeping it for now for backward compatibility)
    // We'll keep the location column for now to allow gradual migration
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe rounds table now includes:');
    console.log('  - location_id (TEXT, references locations.id)');
    console.log('  - location column kept for backward compatibility (will be populated from locations table)');
    console.log('  - address column removed (will be populated from locations table)');
    
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

