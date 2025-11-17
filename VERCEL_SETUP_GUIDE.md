# Quick Vercel Deployment Guide with Authentication

## Prerequisites
- A Vercel account (sign up at https://vercel.com)
- This project pushed to GitHub/GitLab/Bitbucket
- A Neon database already set up

## Step-by-Step Deployment

### 1. Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js configuration

### 2. Configure Environment Variables

Before deploying, add these environment variables:

#### Required Variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | Your Neon database connection string | `postgresql://user:pass@host/db` |
| `AUTH_USERNAME` | Admin username for login | `vhkc_admin_2024` |
| `AUTH_PASSWORD` | Admin password for login | `YourSecurePassword123!` |

#### How to Add Variables:

1. In the Vercel import screen, find **"Environment Variables"** section
2. OR after deployment, go to **Settings** → **Environment Variables**
3. For each variable:
   - Enter the **Key** (e.g., `AUTH_USERNAME`)
   - Enter the **Value** (e.g., your username)
   - Select environments: **Production**, **Preview**, and **Development**
   - Click **Add**

### 3. Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (usually 2-3 minutes)
3. Once deployed, Vercel will provide your production URL

### 4. Initialize Database (One-Time Setup)

After first deployment, you need to initialize your database:

#### Option A: Run from local machine
```bash
# Ensure your .env.local has DATABASE_URL set
npm run init-db
```

#### Option B: Use Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run initialization
npm run init-db
```

### 5. Test Your Deployment

1. Visit your Vercel production URL
2. You should be redirected to `/login`
3. Enter your `AUTH_USERNAME` and `AUTH_PASSWORD`
4. Verify successful login and dashboard access

## Environment Variables Setup Example

### Production Variables in Vercel:

```
DATABASE_URL = postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/vhkc_db
AUTH_USERNAME = vhkc_staff_admin
AUTH_PASSWORD = SecureP@ssw0rd!2024
```

## Post-Deployment Checklist

- [ ] All environment variables are set in Vercel
- [ ] Database is initialized (run `init-db` script)
- [ ] Can access the login page
- [ ] Can successfully log in with credentials
- [ ] Dashboard loads correctly
- [ ] Data is persisting (create a test season/driver)

## Updating Environment Variables

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Find the variable to update
4. Click the **⋮** menu → **Edit**
5. Update the value
6. Click **Save**
7. **Important:** Redeploy your application:
   - Go to **Deployments**
   - Click **⋮** on latest deployment → **Redeploy**

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors locally

### "Authentication system not configured"
- Verify `AUTH_USERNAME` and `AUTH_PASSWORD` are set in Vercel
- Redeploy after adding variables

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check Neon database is running
- Ensure IP allowlist includes `0.0.0.0/0` in Neon settings (for Vercel)

### Login Not Working
- Clear browser cache/cookies
- Check browser console for errors
- Verify credentials match environment variables exactly (case-sensitive)

## Security Best Practices

1. **Strong Credentials**
   - Use unique, complex passwords
   - Don't reuse passwords from other services

2. **Regular Updates**
   - Change passwords every 3-6 months
   - Update immediately if compromised

3. **Environment Separation**
   - Use different credentials for Preview vs Production
   - Test in Preview environment before promoting to Production

4. **Monitoring**
   - Check Vercel logs for unusual activity
   - Monitor failed login attempts

## Domain Configuration (Optional)

To use a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain
3. Configure DNS according to Vercel's instructions
4. Wait for SSL certificate provisioning (automatic)

## Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch → Production
- Push to other branches → Preview deployments
- Open Pull Requests → Preview deployments

To disable automatic deployments:
1. **Settings** → **Git**
2. Configure deployment branches

## Getting Help

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Check deployment logs for specific errors
- Review `AUTH_SETUP.md` for authentication issues

