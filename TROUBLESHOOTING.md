# Troubleshooting Guide

## API Routes Returning 404

### Issue: `/api/seasons` returns 404

**Solution:** The `next.config.js` file had `output: 'export'` which disables API routes. This has been removed.

**Important Notes:**
- API routes require server-side rendering and cannot work with static exports
- If you need static export for deployment, you'll need to use a different approach (e.g., separate API server or serverless functions)

### Environment Variables Not Set

If you're getting errors about Google Sheets not being configured:

1. Create a `.env.local` file in the root directory
2. Add the following variables:
   ```
   GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
3. Restart your development server

### Google Sheets Not Configured

The application will now gracefully handle missing Google Sheets configuration:
- API routes will return empty arrays instead of errors
- The application will start successfully even without Google Sheets configured
- Check the console for warnings about missing credentials

### Testing API Routes

1. Start the development server: `npm run dev`
2. Open `http://localhost:3000/api/seasons` in your browser
3. You should see `[]` (empty array) if no seasons exist, or an error message if something is wrong

### Common Issues

1. **404 on API routes**: Make sure `output: 'export'` is removed from `next.config.js`
2. **Authentication errors**: Check that your environment variables are set correctly
3. **Sheet not found**: Make sure the Google Spreadsheet exists and has the correct sheet names
4. **Permission errors**: Ensure the service account has Editor access to the spreadsheet

## Development vs Production

### Development
- Run `npm run dev` to start the development server
- API routes will be available at `http://localhost:3000/api/*`
- Environment variables are loaded from `.env.local`

### Production
- API routes require a server environment (cannot be static export)
- Consider deploying to Vercel, Netlify, or similar platforms that support API routes
- Or use a separate API server if you need static frontend deployment

