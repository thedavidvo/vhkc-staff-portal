# Google Sheets Migration Guide

This guide will help you update your existing Google Spreadsheet to support the new features: automatic points calculation, race type tracking, and points confirmation.

## Required Changes to "Race Results" Sheet

You need to add **two new columns** to your existing "Race Results" sheet:

### Current Structure:
```
roundId | driverId | division | position | fastestLap | points
```

### New Structure:
```
roundId | driverId | division | position | fastestLap | points | raceType | confirmed
```

## Step-by-Step Migration

### 1. Open Your Google Spreadsheet

1. Navigate to your Google Spreadsheet
2. Click on the "Race Results" sheet tab

### 2. Add the New Columns

#### Add "raceType" Column:
1. Click on column **G** (the column after "points")
2. Right-click and select "Insert 1 column left" (or right-click on the header of column G and select "Insert 1 column left")
3. In the header row (row 1), type: `raceType`
4. This column will track the type of race:
   - `qualification` - Standard points (default)
   - `heat` - Minor points (when there's also a final race)
   - `final` - Major points

#### Add "confirmed" Column:
1. Click on column **H** (the column after "raceType")
2. Right-click and select "Insert 1 column left"
3. In the header row (row 1), type: `confirmed`
4. This column will track if points have been confirmed:
   - `true` - Points have been confirmed
   - `false` - Points are pending confirmation (default)

### 3. Update Existing Data (Optional)

If you have existing race results, you can:

#### For "raceType" column:
- Set all existing rows to `qualification` (standard points)
- Or manually update based on your race history:
  - If a round had both heat and final races, mark heat results as `heat` and final results as `final`
  - If a round only had qualification, mark as `qualification`

#### For "confirmed" column:
- Set all existing rows to `false` (points need confirmation)
- Or set to `true` if you've already confirmed those points

### 4. Verify the Structure

Your "Race Results" sheet should now have these columns in order:

1. `roundId`
2. `driverId`
3. `division`
4. `position`
5. `fastestLap`
6. `points`
7. `raceType` ← **NEW**
8. `confirmed` ← **NEW**

### 5. Test the Application

1. Start your development server: `npm run dev`
2. Navigate to the Races Management page
3. Save a race result - it should automatically:
   - Calculate points based on position and race type
   - Set the raceType based on the selected race type
   - Set confirmed to `false` by default
4. Navigate to the Points page to confirm and modify points

## Points Calculation Rules

The system automatically calculates points based on:

- **Position**: The finishing position (1st, 2nd, 3rd, etc.)
- **Race Type**:
  - `qualification`: Standard points (75 for 1st, 70 for 2nd, etc.)
  - `heat`: Minor points (15 for 1st, 12 for 2nd, etc.) - only if there's also a final
  - `final`: Major points (60 for 1st, 58 for 2nd, etc.)

### Points Table Reference

| Position | Standard | Major | Minor |
|----------|----------|-------|-------|
| 1st      | 75       | 60    | 15    |
| 2nd      | 70       | 58    | 12    |
| 3rd      | 65       | 56    | 10    |
| ...      | ...      | ...   | ...   |
| 50th     | 2        | 1     | 1     |

See `lib/pointsSystem.ts` for the complete points table.

## Troubleshooting

### "Column not found" errors
- Verify column names match exactly (case-sensitive)
- Ensure headers are in row 1
- Check for extra spaces in column names

### Points not calculating correctly
- Verify the `raceType` column has valid values: `qualification`, `heat`, or `final`
- Check that `position` values are valid numbers (1-50)
- Ensure the points calculation logic in `lib/pointsSystem.ts` matches your requirements

### Points confirmation not working
- Verify the `confirmed` column exists
- Ensure values are `true` or `false` (as strings or booleans)
- Check that the Points page is correctly reading the confirmed status

## Notes

- The migration is **backward compatible** - existing data will continue to work
- If `raceType` is missing, it defaults to `qualification`
- If `confirmed` is missing, it defaults to `false`
- You can manually update race types and confirmation status in the Google Sheet
- The Points page allows you to modify and confirm points after they're calculated

## Need Help?

If you encounter any issues during migration:
1. Check the browser console for error messages
2. Verify all column names match exactly
3. Ensure the service account has Editor access to the spreadsheet
4. Try refreshing the application after making changes to the sheet structure

