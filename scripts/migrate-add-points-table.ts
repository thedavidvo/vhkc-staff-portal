import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from '../lib/db';

async function migrate() {
  try {
    console.log('Starting migration to add points table...');
    
    // Check if table already exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'points'
    ` as any[];
    
    if (tableCheck.length > 0) {
      console.log('✓ Points table already exists, skipping creation...');
    } else {
      console.log('Creating points table...');
      await sql`
        CREATE TABLE points (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          round_id TEXT NOT NULL,
          driver_id TEXT NOT NULL,
          division TEXT NOT NULL,
          race_type TEXT DEFAULT 'qualification',
          final_type TEXT,
          overall_position INTEGER,
          points DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(round_id, driver_id, race_type, final_type)
        )
      `;
      console.log('✓ Created points table');
      
      console.log('Creating indexes...');
      await sql`CREATE INDEX IF NOT EXISTS idx_points_season_id ON points(season_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_points_round_id ON points(round_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_points_driver_id ON points(driver_id)`;
      console.log('✓ Created indexes');
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe points table has been created with the following structure:');
    console.log('  - id (TEXT PRIMARY KEY)');
    console.log('  - season_id (TEXT NOT NULL)');
    console.log('  - round_id (TEXT NOT NULL)');
    console.log('  - driver_id (TEXT NOT NULL)');
    console.log('  - division (TEXT NOT NULL)');
    console.log('  - race_type (TEXT DEFAULT \'qualification\')');
    console.log('  - final_type (TEXT)');
    console.log('  - overall_position (INTEGER)');
    console.log('  - points (DECIMAL(10,2) NOT NULL)');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)');
    console.log('  - UNIQUE constraint on (round_id, driver_id, race_type, final_type)');
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

