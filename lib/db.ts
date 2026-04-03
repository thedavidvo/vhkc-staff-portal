import { neon } from '@neondatabase/serverless';

// Lazy-loaded SQL connection
let _sqlConnection: ReturnType<typeof neon> | null = null;

function getSqlConnection() {
  if (!_sqlConnection) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Please set it in .env.local');
    }
    _sqlConnection = neon(DATABASE_URL);
  }
  return _sqlConnection;
}

// Export sql as a function that creates the connection lazily
export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const connection = getSqlConnection();
  return connection(strings, ...values);
};

// Helper function to ensure database is initialized
export async function initializeDatabase() {

  try {
    // Create tables if they don't exist (one at a time for Neon compatibility)
    await sql`
      CREATE TABLE IF NOT EXISTS seasons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        number_of_rounds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        round_number INTEGER,
        date TEXT,
        location_id TEXT,
        location TEXT,
        status TEXT DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_rounds_season_id ON rounds(season_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        mobile_number TEXT,
        division TEXT,
        team_name TEXT,
        status TEXT DEFAULT 'active',
        last_updated TEXT,
        first_name TEXT,
        last_name TEXT,
        date_of_birth TEXT,
        home_track TEXT,
        aliases TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_season_id ON drivers(season_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS race_results (
        id SERIAL PRIMARY KEY,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        driver_alias TEXT,
        division TEXT NOT NULL,
        kart_number TEXT,
        grid_position INTEGER,
        overall_position INTEGER,
        fastest_lap TEXT,
        points DECIMAL(10,2),
        race_type TEXT DEFAULT 'qualification',
        race_name TEXT,
        final_type TEXT,
        race_division TEXT,
        results_sheet_id TEXT,
        confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round_id, driver_id, race_type, final_type)
      )
    `;

    // Add race_division and results_sheet_id columns if they don't exist (for existing databases)
    // This must happen BEFORE creating indexes on these columns
    await sql`
      ALTER TABLE race_results 
      ADD COLUMN IF NOT EXISTS race_division TEXT
    `;
    await sql`
      ALTER TABLE race_results 
      ADD COLUMN IF NOT EXISTS results_sheet_id TEXT
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_round_id ON race_results(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_driver_id ON race_results(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_race_division ON race_results(race_division)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_results_sheet_id ON race_results(results_sheet_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        season_id TEXT NOT NULL,
        division TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_teams_season_id ON teams(season_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS check_ins (
        id TEXT PRIMARY KEY,
        season_id TEXT,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        checked_in BOOLEAN DEFAULT FALSE,
        created_at TEXT,
        UNIQUE(round_id, driver_id)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_check_ins_round_id ON check_ins(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_check_ins_driver_id ON check_ins(driver_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS points (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        division TEXT NOT NULL,
        race_division TEXT,
        race_type TEXT DEFAULT 'qualification',
        final_type TEXT,
        overall_position INTEGER,
        points DECIMAL(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round_id, driver_id, race_type, final_type)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_points_season_id ON points(season_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_points_round_id ON points(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_points_driver_id ON points(driver_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS division_changes (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        from_division TEXT,
        to_division TEXT,
        division_start TEXT,
        change_type TEXT NOT NULL CHECK (change_type IN ('promotion', 'demotion', 'division_start', 'mid_season_join')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add division_start column if it doesn't exist
    try {
      await sql`
        ALTER TABLE division_changes 
        ADD COLUMN IF NOT EXISTS division_start TEXT
      `;
      console.log('✓ Added division_start column to division_changes');
    } catch (error: any) {
      console.warn('Could not add division_start column:', error.message);
    }

    // Make from_division and to_division nullable if they're not already
    try {
      // Check if column exists and is NOT NULL, then make it nullable
      const fromDivisionCheck = await sql`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'division_changes' 
        AND column_name = 'from_division'
      ` as any[];
      
      if (fromDivisionCheck.length > 0 && fromDivisionCheck[0].is_nullable === 'NO') {
        await sql`ALTER TABLE division_changes ALTER COLUMN from_division DROP NOT NULL`;
        console.log('✓ Made from_division nullable in division_changes');
      }
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        console.warn('Could not alter from_division column:', error.message);
      }
    }
    
    try {
      const toDivisionCheck = await sql`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'division_changes' 
        AND column_name = 'to_division'
      ` as any[];
      
      if (toDivisionCheck.length > 0 && toDivisionCheck[0].is_nullable === 'NO') {
        await sql`ALTER TABLE division_changes ALTER COLUMN to_division DROP NOT NULL`;
        console.log('✓ Made to_division nullable in division_changes');
      }
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        console.warn('Could not alter to_division column:', error.message);
      }
    }

    // Update the check constraint to include new change types
    try {
      // Drop existing constraint if it exists
      await sql`ALTER TABLE division_changes DROP CONSTRAINT IF EXISTS division_changes_change_type_check`;
      
      // Add new constraint with all change types
      await sql`
        ALTER TABLE division_changes 
        ADD CONSTRAINT division_changes_change_type_check 
        CHECK (change_type IN ('promotion', 'demotion', 'division_start', 'mid_season_join'))
      `;
      console.log('✓ Updated change_type constraint in division_changes');
    } catch (error: any) {
      // Constraint might already exist or table might not exist yet
      if (!error.message?.includes('already exists') && !error.message?.includes('does not exist')) {
        console.warn('Could not update constraint:', error.message);
      }
    }

    await sql`CREATE INDEX IF NOT EXISTS idx_division_changes_round_id ON division_changes(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_division_changes_driver_id ON division_changes(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_division_changes_season_id ON division_changes(season_id)`;

    // Create payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        stripe_payment_intent_id TEXT,
        payment_date TEXT,
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_payments_season_id ON payments(season_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_round_id ON payments(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_driver_id ON payments(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id)`;

    // Create incidents table
    await sql`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        severity TEXT,
        incident_points INTEGER NOT NULL DEFAULT 0,
        points_to_deduct INTEGER NOT NULL,
        points_deducted INTEGER DEFAULT 0,
        description TEXT NOT NULL,
        reported_by TEXT,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP,
        confirmed_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_season_id ON incidents(season_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_round_id ON incidents(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_driver_id ON incidents(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_confirmed ON incidents(confirmed)`;

    // Add incident_points column if it doesn't exist
    try {
      await sql`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_points INTEGER NOT NULL DEFAULT 0`;
      console.log('✓ Added incident_points column to incidents table');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.warn('Could not add incident_points column:', error.message);
      }
    }

    // Create licenses table
    await sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        driver_id TEXT NOT NULL UNIQUE,
        total_incident_points INTEGER DEFAULT 0,
        is_suspended BOOLEAN DEFAULT FALSE,
        suspended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_licenses_driver_id ON licenses(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_licenses_suspended ON licenses(is_suspended)`;

    // Create license_points_history table for tracking points over time
    await sql`
      CREATE TABLE IF NOT EXISTS license_points_history (
        id TEXT PRIMARY KEY,
        license_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        incident_id TEXT NOT NULL,
        points_added INTEGER NOT NULL,
        points_at_time INTEGER NOT NULL,
        incident_date TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_expired BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_license_history_license_id ON license_points_history(license_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_license_history_driver_id ON license_points_history(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_license_history_incident_id ON license_points_history(incident_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_license_history_expires_at ON license_points_history(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_license_history_expired ON license_points_history(is_expired)`;

    // Create division_change_audit table for tracking
    await sql`
      CREATE TABLE IF NOT EXISTS division_change_audit (
        id TEXT PRIMARY KEY,
        change_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        old_division TEXT,
        new_division TEXT,
        was_locked BOOLEAN DEFAULT FALSE,
        race_count_at_change INTEGER DEFAULT 0,
        reason TEXT,
        changed_by TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_audit_change_id ON division_change_audit(change_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_driver_id ON division_change_audit(driver_id)`;

    console.log('✓ Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

