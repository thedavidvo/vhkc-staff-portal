-- Migration script to update division_changes table for new change types
-- Run this after updating the application code
-- This is for Neon (PostgreSQL) databases

-- Add new columns if they don't exist
ALTER TABLE division_changes 
ADD COLUMN IF NOT EXISTS division_start TEXT;

-- Make from_division and to_division nullable (they're optional for division_start and mid_season_join)
-- Note: These may already be nullable, so this might not be needed
DO $$ 
BEGIN
    -- Check if column is NOT NULL and make it nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'division_changes' 
        AND column_name = 'from_division' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE division_changes ALTER COLUMN from_division DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'division_changes' 
        AND column_name = 'to_division' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE division_changes ALTER COLUMN to_division DROP NOT NULL;
    END IF;
END $$;

-- Update the check constraint to include new change types
-- Drop existing constraint if it exists
ALTER TABLE division_changes 
DROP CONSTRAINT IF EXISTS division_changes_change_type_check;

-- Add new constraint with all change types
ALTER TABLE division_changes 
ADD CONSTRAINT division_changes_change_type_check 
CHECK (change_type IN ('promotion', 'demotion', 'division_start', 'mid_season_join'));

