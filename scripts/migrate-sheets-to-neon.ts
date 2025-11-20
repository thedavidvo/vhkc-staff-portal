/**
 * Migration Script: Google Sheets to Neon Postgres
 * 
 * This script migrates all data from Google Sheets to Neon database.
 * Run with: npm run migrate
 */

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import the rest
import * as sheetsService from '../lib/sheetsDataService';
import * as dbService from '../lib/dbService';
import { initializeDatabase } from '../lib/db';

async function migrateData() {
  console.log('Starting migration from Google Sheets to Neon Postgres...\n');
  
  try {
    // Initialize database
    console.log('Initializing database schema...');
    await initializeDatabase();
    console.log('✓ Database schema initialized\n');
    
    // 1. Migrate Seasons
    console.log('Migrating Seasons...');
    const seasons = await sheetsService.getSeasons();
    for (const season of seasons) {
      try {
        await dbService.addSeason(season);
        console.log(`  ✓ Migrated season: ${season.name}`);
      } catch (error: any) {
        console.log(`  ⚠ Season ${season.name} may already exist: ${error.message}`);
      }
    }
    console.log(`✓ Migrated ${seasons.length} seasons\n`);
    
    // 2. Migrate Locations
    console.log('Migrating Locations...');
    const locations = await sheetsService.getLocations();
    for (const location of locations) {
      try {
        await dbService.addLocation(location);
        console.log(`  ✓ Migrated location: ${location.name}`);
      } catch (error: any) {
        console.log(`  ⚠ Location ${location.name} may already exist: ${error.message}`);
      }
    }
    console.log(`✓ Migrated ${locations.length} locations\n`);
    
    // 3. Migrate Drivers
    console.log('Migrating Drivers...');
    let totalDrivers = 0;
    for (const season of seasons) {
      const drivers = await sheetsService.getDriversBySeason(season.id);
      for (const driver of drivers) {
        try {
          await dbService.addDriver(driver, season.id);
          console.log(`  ✓ Migrated driver: ${driver.name} (${season.name})`);
          totalDrivers++;
        } catch (error: any) {
          console.log(`  ⚠ Driver ${driver.name} may already exist: ${error.message}`);
        }
      }
    }
    console.log(`✓ Migrated ${totalDrivers} drivers\n`);
    
    // 4. Migrate Teams
    console.log('Migrating Teams...');
    let totalTeams = 0;
    for (const season of seasons) {
      const teams = await sheetsService.getTeamsBySeason(season.id);
      for (const team of teams) {
        try {
          await dbService.addTeam(team, season.id);
          console.log(`  ✓ Migrated team: ${team.name} (${season.name})`);
          totalTeams++;
        } catch (error: any) {
          console.log(`  ⚠ Team ${team.name} may already exist: ${error.message}`);
        }
      }
    }
    console.log(`✓ Migrated ${totalTeams} teams\n`);
    
    // 5. Migrate Race Results
    console.log('Migrating Race Results...');
    let totalResults = 0;
    for (const season of seasons) {
      for (const round of season.rounds) {
        try {
          const results = await sheetsService.getRaceResultsByRound(round.id);
          if (!results) continue;
          for (const divisionResult of results) {
            for (const result of divisionResult.results) {
              try {
                await dbService.addRaceResult({
                  ...result,
                  roundId: round.id,
                  division: divisionResult.division,
                });
                totalResults++;
              } catch (error: any) {
                console.log(`    ⚠ Result for driver ${result.driverId} in round ${round.name} may already exist`);
              }
            }
          }
          console.log(`  ✓ Migrated results for round: ${round.name} (${season.name})`);
        } catch (error: any) {
          console.log(`  ⚠ Error migrating results for round ${round.name}: ${error.message}`);
        }
      }
    }
    console.log(`✓ Migrated ${totalResults} race results\n`);
    
    // 6. Migrate Check-ins
    console.log('Migrating Check-ins...');
    let totalCheckIns = 0;
    for (const season of seasons) {
      for (const round of season.rounds) {
        try {
          const checkIns = await sheetsService.getCheckInsByRound(round.id);
          for (const checkIn of checkIns) {
            try {
              await dbService.addCheckIn(checkIn);
              totalCheckIns++;
            } catch (error: any) {
              console.log(`    ⚠ Check-in for driver ${checkIn.driverId} in round ${round.name} may already exist`);
            }
          }
          if (checkIns.length > 0) {
            console.log(`  ✓ Migrated check-ins for round: ${round.name} (${season.name})`);
          }
        } catch (error: any) {
          console.log(`  ⚠ Error migrating check-ins for round ${round.name}: ${error.message}`);
        }
      }
    }
    console.log(`✓ Migrated ${totalCheckIns} check-ins\n`);
    
    console.log('===================================');
    console.log('Migration Summary:');
    console.log('===================================');
    console.log(`Seasons:        ${seasons.length}`);
    console.log(`Locations:      ${locations.length}`);
    console.log(`Drivers:        ${totalDrivers}`);
    console.log(`Teams:          ${totalTeams}`);
    console.log(`Race Results:   ${totalResults}`);
    console.log(`Check-ins:      ${totalCheckIns}`);
    console.log('===================================');
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateData().then(() => {
  console.log('\nYou can now update your API routes to use dbService instead of sheetsDataService');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

