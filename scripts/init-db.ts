/**
 * Database Initialization Script
 * 
 * This script initializes the Neon database schema by creating all necessary tables.
 * Run with: npm run init-db
 */

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import the rest
import { initializeDatabase } from '../lib/db';

async function main() {
  console.log('Initializing Neon database schema...\n');
  
  try {
    await initializeDatabase();
    console.log('\n✅ Database initialized successfully!');
    console.log('\nNext step: Run "npm run migrate" to transfer data from Google Sheets');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    console.error('\nMake sure:');
    console.error('1. You have created a Neon database');
    console.error('2. DATABASE_URL is set in your .env.local file');
    console.error('3. The connection string is correct and includes ?sslmode=require');
    process.exit(1);
  }
}

main();

