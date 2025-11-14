# Deploying to Vercel with Google Sheets Integration

This guide will walk you through deploying your VHKC Staff Portal to Vercel with Google Sheets API credentials.

## Prerequisites

1. A Google Cloud Project with Google Sheets API enabled
2. A service account with credentials (JSON key file)
3. A Google Spreadsheet shared with the service account email
4. A Vercel account (free tier works)

## Step 1: Prepare Google Sheets Credentials

1. **Get your Service Account credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Click on your service account (or create one if you haven't)
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file

2. **Extract the necessary values from the JSON file:**
   - Open the downloaded JSON file
   - You'll need:
     - `client_email` - This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `private_key` - This is your `GOOGLE_PRIVATE_KEY` (keep the `\n` characters)
     - `project_id` - Not needed for our app, but useful to know

3. **Get your Spreadsheet ID:**
   - Open your Google Spreadsheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` from the URL

## Step 2: Set Up Vercel Project

1. **Install Vercel CLI (optional, but recommended):**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project:**
   ```bash
   vercel link
   ```
   - Follow the prompts to link your project
   - Or create a new project through the Vercel dashboard

## Step 3: Configure Environment Variables

You need to set the following environment variables in Vercel:

### Option A: Using Vercel Dashboard (Recommended)

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** > **Environment Variables**
3. Add the following environment variables:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `GOOGLE_SPREADSHEET_ID` | Your spreadsheet ID from Step 1 | Production, Preview, Development |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` from your JSON file | Production, Preview, Development |
   | `GOOGLE_PRIVATE_KEY` | The `private_key` from your JSON file (keep `\n` characters) | Production, Preview, Development |

### Option B: Using Vercel CLI

```bash
vercel env add GOOGLE_SPREADSHEET_ID
# Paste your spreadsheet ID when prompted
# Select: Production, Preview, Development

vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste your service account email when prompted
# Select: Production, Preview, Development

vercel env add GOOGLE_PRIVATE_KEY
# Paste your private key when prompted (keep the \n characters)
# Select: Production, Preview, Development
```

### Important Notes for `GOOGLE_PRIVATE_KEY`:

- The private key contains `\n` (newline) characters that need to be preserved
- When adding via Vercel dashboard, paste the entire key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- The key should look like:
  ```
  -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
  ```
- If you're having issues, you can also escape it properly in the JSON file format

## Step 4: Deploy to Vercel

### Option A: Using Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the repository in Vercel
3. Vercel will automatically detect Next.js
4. Configure build settings (usually auto-detected):
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
5. Click **Deploy**

### Option B: Using Vercel CLI

```bash
vercel --prod
```

This will:
- Build your Next.js application
- Deploy it to Vercel
- Use the environment variables you configured

## Step 5: Verify Deployment

1. After deployment, visit your Vercel URL
2. Test the application:
   - Check if seasons load
   - Try adding a driver
   - Try adding a location
   - Try adding a team
   - Verify data is being saved to Google Sheets

## Step 6: Troubleshooting

### Common Issues:

1. **"Google Sheets credentials not configured" error:**
   - Verify all three environment variables are set in Vercel
   - Check that the variable names match exactly (case-sensitive)
   - Verify the private key includes `\n` characters

2. **"Sheet not found" error:**
   - Verify the spreadsheet ID is correct
   - Ensure the spreadsheet is shared with the service account email
   - Check that the sheet names match (Seasons, Rounds, Drivers, Race Results, Locations, Teams)

3. **"Permission denied" error:**
   - Ensure the service account email has edit access to the spreadsheet
   - Re-share the spreadsheet with the service account email

4. **Build fails:**
   - Check the build logs in Vercel dashboard
   - Verify `package.json` has all dependencies
   - Ensure Node.js version is compatible (Vercel auto-detects, but you can specify in `vercel.json`)

### Testing Environment Variables:

You can test if your environment variables are set correctly by:

1. Adding a temporary API route to check:
   ```typescript
   // app/api/test-env/route.ts
   import { NextResponse } from 'next/server';
   
   export async function GET() {
     return NextResponse.json({
       hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
       hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
       hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
       // Don't expose actual values in production!
     });
   }
   ```

2. Visit `https://your-app.vercel.app/api/test-env`
3. Verify all values are `true`

## Step 7: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions
5. Vercel will automatically handle SSL certificates

## Environment Variables Summary

```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

## Security Best Practices

1. **Never commit credentials to Git:**
   - The `.env.local` file should be in `.gitignore`
   - Never commit the service account JSON file

2. **Use different spreadsheets for different environments:**
   - Consider using a test spreadsheet for preview deployments
   - Use production spreadsheet only for production deployments

3. **Rotate credentials regularly:**
   - Periodically regenerate service account keys
   - Update environment variables in Vercel

4. **Limit service account permissions:**
   - Only grant the service account access to the specific spreadsheet
   - Don't grant unnecessary permissions

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)

## Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Check the browser console for errors
3. Verify environment variables are set correctly
4. Ensure the spreadsheet is shared with the service account
5. Check that all required sheets exist in the spreadsheet

