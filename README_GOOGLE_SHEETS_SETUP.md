# Google Sheets Setup Instructions

This application uses Google Sheets as its database. Follow these steps to set it up:

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## 2. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter a name for the service account (e.g., "vhkc-sheets-service")
4. Click "Create and Continue"
5. Skip role assignment (optional)
6. Click "Done"

## 3. Create Service Account Key

1. Click on the created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file
6. **Keep this file secure** - it contains your private key

## 4. Extract Credentials from JSON

Open the downloaded JSON file and extract:
- `client_email`: This is your service account email
- `private_key`: This is your private key (keep the full key including BEGIN/END markers)

## 5. Create Google Spreadsheet

1. Create a new Google Spreadsheet
2. Rename it (e.g., "VHKC Staff Portal Data")
3. Create the following sheets with these exact names and headers:

### Sheet 1: "Seasons"
Headers (Row 1):
```
id | name | startDate | endDate | numberOfRounds
```

### Sheet 2: "Rounds"
Headers (Row 1):
```
id | seasonId | roundNumber | name | date | location | address | status
```

### Sheet 3: "Drivers"
Headers (Row 1):
```
id | seasonId | name | email | division | teamName | status | lastRacePosition | fastestLap | pointsTotal | lastUpdated | firstName | lastName | dateOfBirth | homeTrack | alias | aliases
```

**Note:** 
- The `alias` column is deprecated but kept for backwards compatibility. Use `aliases` instead.
- The `aliases` column should contain comma-separated aliases (e.g., `Alias1,Alias2,Alias3`)
- `lastRacePosition`, `fastestLap`, and `pointsTotal` columns are not used by the application and can be managed manually in Google Sheets.

### Sheet 4: "Race Results"
Headers (Row 1):
```
roundId | driverId | division | kartNumber | position | fastestLap | points | raceType | confirmed
```

**Note:** 
- `division` is the division the driver was racing in for that specific result
- `kartNumber` is the kart number used by the driver in that race
- `raceType` can be: `qualification` (standard points), `heat` (minor points), or `final` (major points)
- `confirmed` should be `true` or `false` to track if points have been confirmed

### Sheet 5: "Locations"
Headers (Row 1):
```
id | name | address
```

### Sheet 6: "Teams"
Headers (Row 1):
```
id | seasonId | name | division | driverIds | createdAt
```

**Note:** The `driverIds` column should contain comma-separated driver IDs (e.g., `driver-1,driver-2,driver-3`)

## 6. Share Spreadsheet with Service Account

1. In your Google Spreadsheet, click the "Share" button
2. Paste the service account email (from step 3)
3. Give it "Editor" access
4. Uncheck "Notify people" (optional)
5. Click "Share"

## 7. Get Spreadsheet ID

1. Open your Google Spreadsheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Copy the `SPREADSHEET_ID` part

## 8. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in the values:
   ```
   GOOGLE_SPREADSHEET_ID=paste-spreadsheet-id-here
   GOOGLE_SERVICE_ACCOUNT_EMAIL=paste-service-account-email-here
   GOOGLE_PRIVATE_KEY="paste-private-key-here"
   ```

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` should include the full key with newlines, wrapped in quotes
- If you're having issues, make sure the private key includes `\n` for line breaks or use actual line breaks

## 9. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to the application
3. Check the browser console for any errors
4. Try creating a season to verify the connection works

## Troubleshooting

### "Error reading sheet"
- Verify the sheet names match exactly (case-sensitive)
- Verify the service account has Editor access to the spreadsheet
- Check that the spreadsheet ID is correct

### "Authentication failed"
- Verify the service account email is correct
- Verify the private key is correct and includes BEGIN/END markers
- Make sure the private key uses `\n` for line breaks or actual newlines

### "Sheet not found"
- Verify sheet names match exactly
- Make sure all sheets exist in the spreadsheet
- Check that headers are in row 1

## Data Migration

If you have existing mock data to migrate:
1. Use the migration script (if provided) or
2. Manually copy data to the Google Spreadsheet following the schema above

