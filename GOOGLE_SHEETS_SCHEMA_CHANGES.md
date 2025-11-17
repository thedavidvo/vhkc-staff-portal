# Google Sheets Schema Changes

This document outlines all the schema changes needed for the Google Sheets database.

## Summary of Changes

1. **Race Results Sheet**: Removed `points` column (points are now calculated dynamically)
2. **Drivers Sheet**: `aliases` column is the only field (comma-separated), `alias` column has been completely removed

**Note:** "Records" in the Results tab refers to saved race results - they are stored in the "Race Results" sheet, not a separate Records sheet.

## Detailed Schema Changes

### 1. Race Results Sheet

**Previous Schema:**
```
roundId | driverId | division | kartNumber | position | fastestLap | points | raceType | raceName | confirmed
```

**Current Schema:**
```
roundId | driverId | driverAlias | division | kartNumber | gridPosition | overallPosition | fastestLap | raceType | raceName | finalType | confirmed
```

**Changes:**
- ❌ **Removed**: `points` column (points are calculated dynamically, not stored)
- ❌ **Removed**: `position` column (replaced with `gridPosition`)
- ✅ **Added**: `driverAlias` column (stores the driver alias used in the race)
- ✅ **Added**: `gridPosition` column (stores the grid/starting position)
- ✅ **Added**: `overallPosition` column (stores the overall finishing position across all divisions)
- ✅ **Added**: `finalType` column (stores the group number 1-6 for Qualification races, or final type A-F for Heat and Final races)
- ✅ **Kept**: All other columns remain the same

**Migration Steps:**
1. Open the "Race Results" sheet
2. Find the "points" column and delete it (right-click on column header > Delete column)
3. Add "driverAlias" column after "driverId" column:
   - Click on the "division" column header (it will be after "driverId")
   - Right-click and select "Insert 1 column left"
   - In the header row (row 1), type: `driverAlias`
4. Rename "position" column to "gridPosition":
   - Click on the "position" column header
   - Rename it to `gridPosition` in the header row (row 1)
   - OR delete the "position" column and add a new "gridPosition" column in its place
5. Add "overallPosition" column after "gridPosition" column:
   - Click on the "fastestLap" column header (it will be after "gridPosition")
   - Right-click and select "Insert 1 column left"
   - In the header row (row 1), type: `overallPosition`
6. Add "finalType" column after "raceName" column:
   - Click on the "confirmed" column header (it will be after "raceName")
   - Right-click and select "Insert 1 column left"
   - In the header row (row 1), type: `finalType`
7. No data migration needed - points will be calculated automatically, and driverAlias/gridPosition/overallPosition/finalType will be populated when saving new race results

**Default Values:**
- `raceType` defaults to `final` when creating new records

---

### 2. Drivers Sheet

**Current Schema:**
```
id | seasonId | name | email | division | teamName | status | lastRacePosition | fastestLap | pointsTotal | lastUpdated | firstName | lastName | dateOfBirth | homeTrack | aliases
```

**Changes:**
- ✅ **Primary**: `aliases` column - comma-separated list of aliases (e.g., "Alias1,Alias2,Alias3")
- ❌ **Removed**: `alias` column - completely removed from the schema

**Migration Steps:**
1. For existing drivers with only `alias` populated:
   - Copy the value from `alias` to `aliases` column
   - Delete the `alias` column after migration
2. For new drivers:
   - Always use the `aliases` column
   - Enter multiple aliases separated by commas (e.g., "Speedster,The Flash,Lightning")

**Note:** The `aliases` column is the only source of truth for driver aliases. All alias data should be stored in comma-separated format in the `aliases` column.

---

### 3. Race Results Records Sheet (NEW)

**Schema:**
```
id | seasonId | roundId | division | raceType | driverId | driverName | position | fastestLap | points | rank | createdAt
```

**Purpose:**
- Store snapshots of race result standings (rankings) for specific races
- Each record represents one driver's result in a specific race (round + division + race type)
- Allows tracking standings at a point in time

**Column Descriptions:**
- `id`: Unique identifier for the record
- `seasonId`: Season this record belongs to
- `roundId`: Round this record is from
- `division`: Division the driver was racing in
- `raceType`: Type of race (`qualification`, `heat`, or `final`)
- `driverId`: Driver ID
- `driverName`: Driver name (for easy reference)
- `position`: Finishing position in the race
- `fastestLap`: Fastest lap time (string format)
- `points`: Points earned (calculated dynamically)
- `rank`: Driver's rank in the standings for this race (1-based)
- `createdAt`: Date when the record was created (YYYY-MM-DD format)

**Setup Steps:**
1. Create a new sheet named "Race Results Records" (exact name, case-sensitive)
2. Add the header row (row 1) with all column names listed above
3. The sheet will be automatically populated when records are saved in the Results tab

---

### 4. Check Ins Sheet (NEW)

**Schema:**
```
id | seasonId | roundId | driverId | checkedIn | createdAt
```

**Purpose:**
- Track driver check-in status for each round
- Each record represents whether a driver has checked in for a specific round
- Allows filtering and viewing check-in statistics

**Column Descriptions:**
- `id`: Unique identifier for the check-in record (format: `checkin-{roundId}-{driverId}`)
- `seasonId`: Season this check-in belongs to
- `roundId`: Round this check-in is for
- `driverId`: Driver ID
- `checkedIn`: Check-in status (`true` or `false` as string)
- `createdAt`: Date when the check-in record was created (YYYY-MM-DD format)

**Setup Steps:**
1. Create a new sheet named "Check Ins" (exact name, case-sensitive)
2. Add the header row (row 1) with all column names listed above in the exact order shown
3. The sheet will be automatically populated when drivers check in from the Check In tab

**Important Notes:**
- Column names are case-sensitive but the code handles case-insensitive matching
- `checkedIn` values are stored as strings: `"true"` or `"false"` (not boolean values)
- The `id` column is automatically generated if not provided
- The `createdAt` column is automatically set to the current date if not provided

---

## Complete Sheet List

Your Google Spreadsheet should have these sheets:

1. **Seasons** - Season information
2. **Rounds** - Round/event information
3. **Drivers** - Driver information with `aliases` column
4. **Race Results** - Race results (without `points` column)
5. **Locations** - Location/track information
6. **Teams** - Team information
7. **Race Results Records** - Standings snapshots for specific races (NEW)
8. **Check Ins** - Driver check-in status for rounds (NEW)

**Note:** 
- In the Results tab, "Create Race Result" creates a race result entry in the "Race Results" sheet
- "Race Results Records" stores snapshots of standings for a specific race (round + division + race type)

---

## Quick Migration Checklist

- [ ] Delete `points` column from "Race Results" sheet
- [ ] Update existing drivers to use `aliases` column (optional - backwards compatible)
- [ ] Create new "Race Results Records" sheet with headers
- [ ] Create new "Check Ins" sheet with headers: `id | seasonId | roundId | driverId | checkedIn | createdAt`
- [ ] Verify all sheet names match exactly (case-sensitive)
- [ ] Share spreadsheet with service account email
- [ ] Test creating a new race result in the Results tab
- [ ] Test saving a race result record in the Results tab
- [ ] Test checking in a driver in the Check In tab

---

## Default Values

When creating new entries:

- **Race Type**: Defaults to `final` in:
  - Results tab (Create Record modal)
  - Races page (Add Race Name modal)
  
- **Aliases**: Start with empty array, add aliases one at a time using Enter key

---

## Troubleshooting

### "Points column not found" error
- This is expected - points column has been removed
- Points are now calculated dynamically based on position and race type


### Aliases not working
- Make sure `aliases` column exists in "Drivers" sheet
- Use comma-separated format: "Alias1,Alias2,Alias3"
- The `alias` column has been removed - only use `aliases` column

