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
        name TEXT NOT NULL,
        round_number INTEGER,
        date TEXT,
        location TEXT,
        address TEXT,
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
        confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round_id, driver_id, race_type, final_type)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_round_id ON race_results(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_race_results_driver_id ON race_results(driver_id)`;

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
        race_type TEXT DEFAULT 'qualification',
        final_type TEXT,
        overall_position INTEGER,
        points DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round_id, driver_id, race_type, final_type)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_points_season_id ON points(season_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_points_round_id ON points(round_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_points_driver_id ON points(driver_id)`;

    console.log('✓ Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

