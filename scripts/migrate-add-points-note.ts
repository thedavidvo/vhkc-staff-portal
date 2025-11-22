import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to add note column to points table...');
    
    // Check if column already exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'points' AND column_name = 'note'
    ` as any[];
    
    if (columnCheck.length > 0) {
      console.log('✓ Note column already exists, skipping...');
    } else {
      console.log('Adding note column to points table...');
      await sql`
        ALTER TABLE points 
        ADD COLUMN note TEXT
      `;
      console.log('✓ Added note column to points table');
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe points table now includes a note column for storing reasons for point changes.');
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

