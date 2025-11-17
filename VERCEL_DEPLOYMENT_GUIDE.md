# Vercel Deployment Guide

Complete step-by-step guide to deploy your VHKC Staff Portal to Vercel with Neon Postgres.

## Prerequisites

- ✅ GitHub account (or GitLab/Bitbucket)
- ✅ Neon account (free tier available)
- ✅ Vercel account (free tier available)
- ✅ Your code pushed to a Git repository

---

## Step 1: Set Up Neon Database

### 1.1 Create Neon Account & Project

1. Go to [https://neon.tech](https://neon.tech)
2. Click **"Sign Up"** (or **"Log In"** if you have an account)
3. Click **"Create Project"**
4. Fill in:
   - **Project Name**: `vhkc-staff-portal` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `ap-southeast-2` for Australia)
   - **PostgreSQL Version**: Use default (latest)
5. Click **"Create Project"**

### 1.2 Get Connection String

1. In your Neon project dashboard, click **"Connection Details"**
2. **IMPORTANT**: Select **"Pooled connection"** (not direct connection)
   - Pooled connections work better with Vercel's serverless functions
   - They handle connection limits automatically
3. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save this connection string** - you'll need it for Vercel

### 1.3 Initialize Database Schema

**Option A: Using Neon Console (Recommended)**

1. In Neon dashboard, click **"SQL Editor"**
2. Click **"New Query"**
3. Copy and paste the SQL from `lib/db.ts` initialization function
4. Run the query to create all tables

**Option B: Using Migration Script (Local)**

1. Create `.env.local` in your project root:
   ```env
   DATABASE_URL=your-neon-connection-string-here
   ```
2. Run:
   ```bash
   npm run init-db
   ```

---

## Step 2: Prepare Your Code

### 2.1 Push to Git Repository

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for Vercel deployment"

# Create a repository on GitHub and push
git remote add origin https://github.com/yourusername/vhkc-staff-portal.git
git branch -M main
git push -u origin main
```

### 2.2 Verify Build Works Locally

```bash
npm run build
```

If this succeeds, you're ready to deploy!

---

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended) or email

### 3.2 Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Import your Git repository:
   - If using GitHub, select your repository
   - If using GitLab/Bitbucket, connect that account first
3. Click **"Import"**

### 3.3 Configure Project Settings

Vercel should auto-detect Next.js, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3.4 Add Environment Variables

**Before deploying**, add your environment variables:

1. In the project configuration page, scroll to **"Environment Variables"**
2. Click **"Add"** for each variable:

   **Required Variables:**

   | Name | Value | Environment |
   |------|-------|-------------|
   | `DATABASE_URL` | Your Neon pooled connection string | Production, Preview, Development |
   
   Example:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

3. **Important**: 
   - Select **all environments** (Production, Preview, Development)
   - Click **"Save"** after adding each variable

### 3.5 Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (2-5 minutes)
3. Once deployed, you'll see a success message with your URL

---

## Step 4: Post-Deployment Setup

### 4.1 Initialize Database (If Not Done Locally)

If you didn't initialize the database locally:

1. **Option A: Use Neon SQL Editor**
   - Go to Neon dashboard → SQL Editor
   - Run the initialization SQL from `lib/db.ts`

2. **Option B: Use Vercel CLI** (Advanced)
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Link to your project
   vercel link
   
   # Pull environment variables
   vercel env pull .env.local
   
   # Run migration
   npm run init-db
   ```

### 4.2 Migrate Data from Google Sheets (Optional)

If you have existing data in Google Sheets:

1. **Set up Google Sheets credentials locally** (one-time):
   ```env
   # In .env.local (local only, don't add to Vercel)
   GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   SPREADSHEET_ID=your-spreadsheet-id
   DATABASE_URL=your-neon-connection-string
   ```

2. **Run migration locally**:
   ```bash
   npm run migrate
   ```

3. **Verify data** in Neon SQL Editor or your application

### 4.3 Test Your Deployment

1. Visit your Vercel URL (e.g., `https://vhkc-staff-portal.vercel.app`)
2. Test key features:
   - ✅ Login works
   - ✅ Dashboard loads
   - ✅ Can create/view seasons
   - ✅ Can add drivers
   - ✅ Can add race results

---

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to your project → **Settings** → **Domains**
2. Enter your domain (e.g., `staff.vhkc.com`)
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (5-60 minutes)

### 5.2 Update DNS Records

Add these DNS records to your domain provider:

- **Type**: `CNAME`
- **Name**: `@` or `staff` (subdomain)
- **Value**: `cname.vercel-dns.com`

Or use A records as shown in Vercel dashboard.

---

## Step 6: Set Up Automatic Deployments

### 6.1 Enable Auto-Deploy

By default, Vercel automatically deploys:
- ✅ Every push to `main` branch → Production
- ✅ Every push to other branches → Preview
- ✅ Pull requests → Preview deployment

### 6.2 Configure Branch Protection (Recommended)

1. In GitHub, go to repository → **Settings** → **Branches**
2. Add branch protection rule for `main`
3. Require pull request reviews before merging

---

## Troubleshooting

### Build Fails

**Error**: `DATABASE_URL environment variable is not set`

**Solution**: 
- Make sure `DATABASE_URL` is added in Vercel project settings
- Check that it's enabled for the correct environment
- Redeploy after adding variables

**Error**: `Cannot connect to database`

**Solution**:
- Verify connection string is correct
- Make sure you're using **pooled connection** (not direct)
- Check Neon project is active (not paused)

### Database Connection Issues

**Error**: `Connection timeout` or `Too many connections`

**Solution**:
- Use **pooled connection string** (not direct)
- Check Neon project limits
- Verify connection string includes `?sslmode=require`

### Data Not Showing

**Solution**:
- Check if database tables exist (use Neon SQL Editor)
- Verify data was migrated correctly
- Check Vercel function logs for errors

### View Logs

1. In Vercel dashboard → Your project
2. Go to **"Deployments"** tab
3. Click on a deployment
4. Click **"Functions"** tab to see serverless function logs
5. Or use **"Runtime Logs"** for real-time logs

---

## Environment Variables Reference

### Required for Production

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | Neon Postgres connection string | Neon dashboard → Connection Details → Pooled |

### Optional (For Migration Only)

These are only needed locally for migrating from Google Sheets:

| Variable | Description |
|----------|-------------|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Google service account email |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Google service account private key |
| `SPREADSHEET_ID` | Google Sheets spreadsheet ID |

**⚠️ Do NOT add Google Sheets credentials to Vercel** - they're only needed locally for one-time migration.

---

## Cost Estimation

### Free Tier Limits

**Vercel:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions included
- ✅ Custom domains

**Neon:**
- ✅ 10 GB storage
- ✅ Up to 1 GB data transfer/month
- ✅ Unlimited queries
- ✅ Automatic backups

**For most karting clubs, the free tier is sufficient!**

### If You Need More

**Vercel Pro**: $20/month
- More bandwidth
- Team collaboration
- Advanced analytics

**Neon Launch**: $19/month
- 50 GB storage
- More data transfer
- Better performance

---

## Security Best Practices

1. ✅ **Never commit `.env.local`** to Git
2. ✅ **Use environment variables** in Vercel (not in code)
3. ✅ **Rotate database passwords** periodically
4. ✅ **Use pooled connections** (handles security automatically)
5. ✅ **Enable Vercel authentication** if needed
6. ✅ **Monitor usage** in both Vercel and Neon dashboards

---

## Quick Checklist

Before going live:

- [ ] Neon database created and initialized
- [ ] `DATABASE_URL` added to Vercel environment variables
- [ ] Code pushed to Git repository
- [ ] Vercel project deployed successfully
- [ ] Database tables created (via `init-db` or SQL Editor)
- [ ] Data migrated (if applicable)
- [ ] Tested all major features
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring set up (optional)

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Discord**: https://vercel.com/discord
- **Neon Discord**: https://discord.gg/92vNTzKDGp

---

## Next Steps After Deployment

1. **Set up monitoring** (optional)
   - Vercel Analytics
   - Neon monitoring dashboard

2. **Configure backups**
   - Neon automatically backs up, but verify settings

3. **Set up alerts**
   - Vercel: Deployment failures
   - Neon: Database usage limits

4. **Document your setup**
   - Keep connection strings secure
   - Document any custom configurations

---

**🎉 Congratulations!** Your VHKC Staff Portal is now live on Vercel!

