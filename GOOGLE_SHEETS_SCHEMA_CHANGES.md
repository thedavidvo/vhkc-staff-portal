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
roundId | driverId | division | kartNumber | position | fastestLap | raceType | finalType | raceName | confirmed
```

**Changes:**
- ❌ **Removed**: `points` column (points are calculated dynamically, not stored)
- ✅ **Added**: `finalType` column — optional, used when `raceType` is `heat` or `final`
- ✅ **Kept**: All other columns remain the same

**Migration Steps:**
1. Open the "Race Results" sheet
2. Find the "points" column and delete it (right-click on column header > Delete column)
3. Insert a new column named `finalType` immediately after `raceType`
4. Apply Data validation to `finalType`:
   - Criteria: List of items
   - Values: `A,B,C,D,E,F`
   - Show warning (do not reject input) — optional
5. Usage rule: Leave `finalType` blank unless `raceType` is `heat` or `final` (then choose A–F)
6. No data migration needed for `finalType` unless you already track it elsewhere

**Default Values:**
- `raceType` defaults to `final` when creating new records
- `finalType` has no default; choose A–F only when `raceType` is `heat` or `final`

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
id | seasonId | roundId | division | raceType | finalType | driverId | driverName | position | fastestLap | points | rank | createdAt
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
- `finalType`: Only when `raceType` is `heat` or `final`; one of `A`–`F`
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
4. Apply Data validation to `finalType` as a list: `A,B,C,D,E,F` (optional warning)

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

**Note:** 
- In the Results tab, "Create Race Result" creates a race result entry in the "Race Results" sheet
- "Race Results Records" stores snapshots of standings for a specific race (round + division + race type + optional final type)

---

## Quick Migration Checklist

- [ ] Delete `points` column from "Race Results" sheet
- [ ] Add `finalType` column after `raceType` in "Race Results" sheet
- [ ] Add `finalType` column after `raceType` in "Race Results Records" sheet
- [ ] Set Data validation for `finalType` to `A,B,C,D,E,F` (both sheets)
- [ ] Update existing drivers to use `aliases` column (optional - backwards compatible)
- [ ] Create new "Race Results Records" sheet with headers
- [ ] Verify all sheet names match exactly (case-sensitive)
- [ ] Share spreadsheet with service account email
- [ ] Test creating a new race result in the Results tab
- [ ] Test saving a race result record in the Results tab

---

## Default Values

When creating new entries:

- **Race Type**: Defaults to `final` in:
  - Results tab (Create Record modal)
  - Races page (Add Race Name modal)

- **Final Type**: Only select (A–F) when `raceType` is `heat` or `final`
  
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

