# Database Migration Guide

This guide explains how to update your Neon database schema.

## Migration 1: Remove Unused Fields

This section explains how to remove the unused fields (`last_race_position`, `fastest_lap`, and `points_total`) from your Neon database.

## Option 1: Run the Migration Script (Recommended)

The easiest way to update your database is to run the migration script:

```bash
npm run migrate-remove-fields
```

This script will:
1. Check which columns exist in your `drivers` table
2. Safely drop only the columns that exist
3. Provide feedback on what was done

## Option 2: Manual SQL Commands

If you prefer to run the SQL commands manually, you can connect to your Neon database and run:

```sql
-- Check which columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name IN ('last_race_position', 'fastest_lap', 'points_total');

-- Drop the columns (only run if they exist)
ALTER TABLE drivers DROP COLUMN IF EXISTS last_race_position;
ALTER TABLE drivers DROP COLUMN IF EXISTS fastest_lap;
ALTER TABLE drivers DROP COLUMN IF EXISTS points_total;
```

**Note:** If you're using Neon's SQL Editor or a PostgreSQL client, you can run these commands directly.

## What Gets Removed

The following columns will be removed from the `drivers` table:
- `last_race_position` (INTEGER)
- `fastest_lap` (TEXT)
- `points_total` (DECIMAL)

## Why These Fields Are Removed

These fields were removed because:
1. They are not used anywhere in the application code
2. Points are now calculated dynamically from race results
3. Fastest lap is stored in race results, not driver records
4. Last race position is not needed as it can be calculated from race results

## Verification

After running the migration, you can verify the changes by checking the table structure:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;
```

The `drivers` table should now have these columns:
- `id`
- `season_id`
- `name`
- `email`
- `division`
- `team_name`
- `status`
- `last_updated`
- `first_name`
- `last_name`
- `date_of_birth`
- `home_track`
- `aliases`
- `created_at`

## Migration 2: Add Points Table

This section explains how to add the new `points` table to your database.

### Option 1: Run the Migration Script (Recommended)

```bash
npm run migrate-add-points
```

This script will:
1. Check if the `points` table already exists
2. Create the table if it doesn't exist
3. Create necessary indexes
4. Provide feedback on what was done

### Option 2: Manual SQL Commands

If you prefer to run the SQL commands manually:

```sql
CREATE TABLE IF NOT EXISTS points (
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
);

CREATE INDEX IF NOT EXISTS idx_points_season_id ON points(season_id);
CREATE INDEX IF NOT EXISTS idx_points_round_id ON points(round_id);
CREATE INDEX IF NOT EXISTS idx_points_driver_id ON points(driver_id);
```

### Points Table Structure

The `points` table stores the amount of points earned by each driver for each round:

- `id`: Unique identifier for the points record
- `season_id`: The season this points record belongs to
- `round_id`: The round this points record belongs to
- `driver_id`: The driver who earned these points
- `division`: The division the driver was in
- `race_type`: Type of race (qualification, heat, final)
- `final_type`: Final type if applicable (A, B, C, etc.)
- `overall_position`: The overall position in the race
- `points`: The amount of points earned
- `created_at`: When the record was created
- `updated_at`: When the record was last updated

## Important Notes

- **Backup First**: If you have important data, make a backup before running migrations
- **No Data Loss**: Removing unused columns won't affect functionality as they weren't being used
- **New Databases**: If you're creating a new database, the `init-db` script already creates all tables with the correct schema
- **Points Table**: The points table is separate from race_results and allows you to store saved/modified points that may differ from calculated points

## Troubleshooting

If you encounter any errors:

1. **"Column does not exist"**: This is fine - it means the column was already removed or never existed
2. **"Table already exists"**: This is fine - the migration script will skip creation if the table exists
3. **"Permission denied"**: Make sure your database user has CREATE TABLE and ALTER TABLE permissions
4. **Connection errors**: Verify your `DATABASE_URL` is set correctly in `.env.local`

