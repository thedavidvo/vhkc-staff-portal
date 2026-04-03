// Points scoring system
// Position | Standard Points | Major Points | Minor Points
const POINTS_TABLE: Record<number, { standard: number; major: number; minor: number }> = {
  1: { standard: 75, major: 60, minor: 15 },
  2: { standard: 70, major: 58, minor: 12 },
  3: { standard: 65, major: 56, minor: 10 },
  4: { standard: 62, major: 54, minor: 9 },
  5: { standard: 60, major: 52, minor: 8 },
  6: { standard: 58, major: 50, minor: 7 },
  7: { standard: 56, major: 48, minor: 6 },
  8: { standard: 54, major: 46, minor: 5 },
  9: { standard: 52, major: 44, minor: 4 },
  10: { standard: 50, major: 42, minor: 3 },
  11: { standard: 48, major: 40, minor: 2 },
  12: { standard: 46, major: 38, minor: 1 },
  13: { standard: 44, major: 36, minor: 1 },
  14: { standard: 42, major: 34, minor: 1 },
  15: { standard: 40, major: 32, minor: 1 },
  16: { standard: 38, major: 30, minor: 1 },
  17: { standard: 36, major: 28, minor: 1 },
  18: { standard: 34, major: 26, minor: 1 },
  19: { standard: 32, major: 24, minor: 1 },
  20: { standard: 30, major: 22, minor: 1 },
  21: { standard: 28, major: 20, minor: 1 },
  22: { standard: 26, major: 18, minor: 1 },
  23: { standard: 24, major: 16, minor: 1 },
  24: { standard: 22, major: 15, minor: 1 },
  25: { standard: 20, major: 14, minor: 1 },
  26: { standard: 19, major: 13, minor: 1 },
  27: { standard: 18, major: 12, minor: 1 },
  28: { standard: 17, major: 11, minor: 1 },
  29: { standard: 16, major: 10, minor: 1 },
  30: { standard: 15, major: 9, minor: 1 },
  31: { standard: 14, major: 8, minor: 1 },
  32: { standard: 13, major: 7, minor: 1 },
  33: { standard: 12, major: 6, minor: 1 },
  34: { standard: 11, major: 5, minor: 1 },
  35: { standard: 10, major: 4, minor: 1 },
  36: { standard: 9, major: 3, minor: 1 },
  37: { standard: 8, major: 2, minor: 1 },
  38: { standard: 7, major: 1, minor: 1 },
  39: { standard: 6, major: 1, minor: 1 },
  40: { standard: 5, major: 1, minor: 1 },
  41: { standard: 4, major: 1, minor: 1 },
  42: { standard: 3, major: 1, minor: 1 },
  43: { standard: 2, major: 1, minor: 1 },
  44: { standard: 2, major: 1, minor: 1 },
  45: { standard: 2, major: 1, minor: 1 },
  46: { standard: 2, major: 1, minor: 1 },
  47: { standard: 2, major: 1, minor: 1 },
  48: { standard: 2, major: 1, minor: 1 },
  49: { standard: 2, major: 1, minor: 1 },
  50: { standard: 2, major: 1, minor: 1 },
};

export type PointsType = 'standard' | 'major' | 'minor';

/**
 * Get points for a position based on race type
 * @param position - The finishing position (1-based)
 * @param raceType - The type of race: 'qualification' (0 points), 'heat' (minor), or 'final' (standard/major)
 * @param hasHeatRace - Whether there is a heat race (if true and raceType is 'final', use major points)
 * @returns The points awarded for this position
 */
// Find the last position that gets the minimum points for each type
const getLastPositionWithMinPoints = () => {
  let lastStandard = 0;
  let lastMajor = 0;
  let lastMinor = 0;
  
  // Find minimum points values
  const minStandard = Math.min(...Object.values(POINTS_TABLE).map(p => p.standard));
  const minMajor = Math.min(...Object.values(POINTS_TABLE).map(p => p.major));
  const minMinor = Math.min(...Object.values(POINTS_TABLE).map(p => p.minor));
  
  // Find last position with minimum points
  for (let pos = 50; pos >= 1; pos--) {
    const entry = POINTS_TABLE[pos];
    if (entry) {
      if (!lastStandard && entry.standard === minStandard) lastStandard = pos;
      if (!lastMajor && entry.major === minMajor) lastMajor = pos;
      if (!lastMinor && entry.minor === minMinor) lastMinor = pos;
    }
  }
  
  return { lastStandard, lastMajor, lastMinor };
};

const LAST_POSITIONS = getLastPositionWithMinPoints();

export function getPointsForPosition(
  position: number,
  raceType: 'qualification' | 'heat' | 'final' = 'qualification',
  hasHeatRace: boolean = false
): number {
  // Qualification races: no points awarded
  if (raceType === 'qualification') {
    return 0;
  }

  if (position < 1) {
    return 0;
  }

  // Determine the last position that should get points based on race type
  let lastPosition = 0;
  if (raceType === 'final') {
    lastPosition = hasHeatRace ? LAST_POSITIONS.lastMajor : LAST_POSITIONS.lastStandard;
  } else if (raceType === 'heat') {
    lastPosition = LAST_POSITIONS.lastMinor;
  }

  // If position is beyond the last position that gets points, return 0
  if (lastPosition > 0 && position > lastPosition) {
    return 0;
  }

  // Also check if position is beyond the table (safety check)
  if (position > 50) {
    return 0;
  }

  const pointsEntry = POINTS_TABLE[position];
  if (!pointsEntry) {
    return 0;
  }

  // Final races: use major points (60 for 1st) if heat race exists, otherwise standard points (75 for 1st)
  if (raceType === 'final') {
    return hasHeatRace ? pointsEntry.major : pointsEntry.standard;
  }

  // Heat races always use minor points
  if (raceType === 'heat') {
    return pointsEntry.minor;
  }

  // Default: no points
  return 0;
}

/**
 * Get all points for a position (for display purposes)
 */
export function getAllPointsForPosition(position: number): { standard: number; major: number; minor: number } | null {
  if (position < 1 || position > 50) {
    return null;
  }
  return POINTS_TABLE[position] || null;
}

