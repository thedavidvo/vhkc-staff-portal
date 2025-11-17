# Neon Database Migration Guide

This guide will help you migrate your VHKC Staff Portal from Google Sheets to Neon Postgres for deployment on Vercel.

## Why Neon?

- **Serverless**: Perfect for Vercel's serverless functions
- **Fast**: Sub-millisecond query times with connection pooling
- **Scalable**: Automatically scales with your traffic
- **Cost-effective**: Pay only for what you use
- **Developer-friendly**: Full Postgres compatibility

## Prerequisites

- A [Neon account](https://neon.tech) (free tier available)
- Your existing Google Sheets data
- Node.js and npm installed

## Step 1: Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click "Create Project"
3. Choose a name for your project (e.g., "vhkc-staff-portal")
4. Select a region closest to your users
5. Click "Create Project"

## Step 2: Get Database Connection String

1. In your Neon project dashboard, click "Connection Details"
2. Copy the connection string (it looks like: `postgresql://user:password@host/database`)
3. Make sure to select the **pooled connection** option for better performance

## Step 3: Configure Environment Variables

### For Local Development

Create or update `.env.local` in your project root:

```env
# Neon Database Connection
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Keep your existing Google Sheets credentials for migration
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=your-spreadsheet-id
```

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon connection string
   - **Environment**: Production, Preview, Development (select all)
4. Click "Save"

## Step 4: Initialize Database Schema

Run the following command to create all necessary tables:

```bash
npm run init-db
```

This will create the following tables:
- `seasons` - Season information
- `rounds` - Round/event information
- `drivers` - Driver information with aliases
- `race_results` - Race results
- `locations` - Location/track information
- `teams` - Team information
- `race_result_records` - Race result snapshots
- `check_ins` - Driver check-in status

## Step 5: Migrate Data from Google Sheets

Run the migration script to transfer all your existing data:

```bash
npm run migrate
```

This script will:
1. Connect to your Google Sheets
2. Fetch all data (seasons, drivers, results, etc.)
3. Insert the data into your Neon database
4. Display a summary of migrated data

**Note**: The script is safe to run multiple times - it will skip existing records.

## Step 6: Verify Migration

After migration completes, verify your data:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000` and check:
   - Seasons are listed
   - Drivers are displayed
   - Race results show correctly
   - All features work as expected

## Step 7: Deploy to Vercel

### First-time Deployment

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel
```

### Subsequent Deployments

```bash
# Deploy to production
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments on push.

## Database Management

### Viewing Data

You can view and query your data directly in the Neon Console:

1. Go to your Neon project
2. Click "SQL Editor"
3. Run queries to inspect your data

Example queries:

```sql
-- View all seasons
SELECT * FROM seasons;

-- View drivers for a specific season
SELECT * FROM drivers WHERE season_id = 'your-season-id';

-- View race results for a round
SELECT * FROM race_results WHERE round_id = 'your-round-id';
```

### Backup Your Data

Neon automatically backs up your data, but you can also export:

1. Go to Neon Console
2. Click your project
3. Navigate to "Backups"
4. Download a backup or restore from a previous point in time

### Connection Pooling

The application uses Neon's connection pooling for optimal performance. Each API route automatically manages connections, so you don't need to worry about connection limits.

## Performance Optimization

### 1. Indexes

The migration script automatically creates indexes on frequently queried columns:
- `rounds.season_id`
- `drivers.season_id`
- `race_results.round_id`
- `race_results.driver_id`

### 2. Caching

The application caches frequently accessed data:
- Seasons: 5 minutes
- Drivers: 3 minutes
- Race results: 1 minute

### 3. Query Optimization

All queries use parameterized statements to prevent SQL injection and improve performance.

## Troubleshooting

### Connection Errors

**Problem**: "Database connection not configured"

**Solution**: Make sure `DATABASE_URL` is set in your environment variables:
```bash
# Check if variable is set
echo $DATABASE_URL
```

### Migration Fails

**Problem**: Migration script fails with "Record already exists"

**Solution**: This is normal - the script skips existing records. If you want to start fresh:
1. Drop all tables in Neon Console SQL Editor:
   ```sql
   DROP TABLE IF EXISTS check_ins CASCADE;
   DROP TABLE IF EXISTS race_result_records CASCADE;
   DROP TABLE IF EXISTS race_results CASCADE;
   DROP TABLE IF EXISTS teams CASCADE;
   DROP TABLE IF EXISTS drivers CASCADE;
   DROP TABLE IF EXISTS locations CASCADE;
   DROP TABLE IF EXISTS rounds CASCADE;
   DROP TABLE IF EXISTS seasons CASCADE;
   ```
2. Run `npm run init-db` again
3. Run `npm run migrate` again

### Slow Queries

**Problem**: Queries are slower than expected

**Solutions**:
1. Check your Neon region - use one closest to your Vercel deployment
2. Use the pooled connection string (not direct connection)
3. Review query patterns and add indexes if needed

### Vercel Deployment Issues

**Problem**: App works locally but fails on Vercel

**Solutions**:
1. Make sure `DATABASE_URL` is set in Vercel environment variables
2. Check Vercel logs for specific errors
3. Ensure you're using the serverless-compatible Neon client

## Cost Estimation

### Neon Free Tier Includes:
- 10 GB storage
- Up to 1 GB of data transfer
- Unlimited queries

For most karting clubs, the free tier is sufficient. If you need more:
- **Launch**: $19/month - 50 GB storage
- **Scale**: $69/month - Unlimited storage

## Rollback Plan

If you need to rollback to Google Sheets:

1. The migration does NOT delete your Google Sheets data
2. Simply revert the API routes to use `sheetsDataService`:
   ```bash
   git revert HEAD
   ```
3. Redeploy to Vercel

## Support

For issues:
- Neon Documentation: https://neon.tech/docs
- Neon Discord: https://discord.gg/92vNTzKDGp
- Vercel Documentation: https://vercel.com/docs

## Next Steps

After successful migration:

1. **Monitor Performance**: Use Neon's monitoring dashboard to track query performance
2. **Set up Alerts**: Configure alerts for high database usage
3. **Regular Backups**: Although Neon handles this, consider periodic exports
4. **Optimize Queries**: Review slow queries and add indexes as needed
5. **Scale as Needed**: Upgrade your Neon plan when you approach limits

## Comparison: Before vs After

| Feature | Google Sheets | Neon |
|---------|--------------|------|
| **Setup Time** | 5 minutes | 10 minutes |
| **Query Speed** | ~500ms | ~5ms |
| **Concurrent Users** | Limited | Unlimited |
| **Data Validation** | Manual | Automatic |
| **Relationships** | None | Foreign keys |
| **Transactions** | No | Yes |
| **Cost** | Free | Free (with limits) |
| **Scalability** | Poor | Excellent |

---

**Congratulations!** You've successfully migrated to Neon Postgres. Your application is now faster, more scalable, and production-ready for Vercel deployment. 🎉

