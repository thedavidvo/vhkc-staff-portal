// Points scoring system
// Position | Standard Points | Major Points | Minor Points
const POINTS_TABLE: Record<number, { standard: number; major: number; minor: number }> = {
  1: { standard: 120, major: 90, minor: 30 },
  2: { standard: 115, major: 86, minor: 29 },
  3: { standard: 110, major: 82, minor: 28 },
  4: { standard: 106, major: 79, minor: 27 },
  5: { standard: 102, major: 76, minor: 26 },
  6: { standard: 98, major: 73, minor: 25 },
  7: { standard: 94, major: 70, minor: 24 },
  8: { standard: 90, major: 68, minor: 23 },
  9: { standard: 86, major: 66, minor: 22 },
  10: { standard: 82, major: 64, minor: 21 },
  11: { standard: 79, major: 62, minor: 20 },
  12: { standard: 76, major: 60, minor: 19 },
  13: { standard: 73, major: 58, minor: 18 },
  14: { standard: 70, major: 56, minor: 17 },
  15: { standard: 67, major: 54, minor: 16 },
  16: { standard: 65, major: 52, minor: 15 },
  17: { standard: 63, major: 50, minor: 14 },
  18: { standard: 61, major: 48, minor: 13 },
  19: { standard: 59, major: 46, minor: 12 },
  20: { standard: 57, major: 44, minor: 11 },
  21: { standard: 55, major: 42, minor: 10 },
  22: { standard: 53, major: 40, minor: 9 },
  23: { standard: 51, major: 38, minor: 8 },
  24: { standard: 49, major: 36, minor: 7 },
  25: { standard: 47, major: 34, minor: 6 },
  26: { standard: 45, major: 32, minor: 5 },
  27: { standard: 43, major: 30, minor: 4 },
  28: { standard: 41, major: 28, minor: 3 },
  29: { standard: 39, major: 26, minor: 2 },
  30: { standard: 37, major: 24, minor: 1 },
  31: { standard: 35, major: 22, minor: 1 },
  32: { standard: 33, major: 20, minor: 1 },
  33: { standard: 31, major: 18, minor: 1 },
  34: { standard: 29, major: 17, minor: 1 },
  35: { standard: 27, major: 16, minor: 1 },
  36: { standard: 25, major: 15, minor: 1 },
  37: { standard: 23, major: 14, minor: 1 },
  38: { standard: 21, major: 13, minor: 1 },
  39: { standard: 19, major: 12, minor: 1 },
  40: { standard: 17, major: 11, minor: 1 },
  41: { standard: 15, major: 10, minor: 1 },
  42: { standard: 13, major: 9, minor: 1 },
  43: { standard: 11, major: 8, minor: 1 },
  44: { standard: 9, major: 7, minor: 1 },
  45: { standard: 7, major: 6, minor: 1 },
  46: { standard: 5, major: 5, minor: 1 },
  47: { standard: 4, major: 4, minor: 1 },
  48: { standard: 3, major: 3, minor: 1 },
  49: { standard: 2, major: 2, minor: 1 },
  50: { standard: 1, major: 1, minor: 1 },
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

  // Final races: use major points if heat race exists, otherwise standard points
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

