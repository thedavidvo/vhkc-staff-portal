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
 * @param raceType - The type of race: 'qualification' (standard), 'heat' (minor), or 'final' (standard/major)
 * @param hasHeatRace - Whether there is a heat race (if true and raceType is 'qualification', use minor points)
 * @returns The points awarded for this position
 */
export function getPointsForPosition(
  position: number,
  raceType: 'qualification' | 'heat' | 'final' = 'qualification',
  hasHeatRace: boolean = false
): number {
  if (position < 1 || position > 50) {
    return 0;
  }

  const pointsEntry = POINTS_TABLE[position];
  if (!pointsEntry) {
    return 0;
  }

  // Final races ALWAYS use standard points (highest points, e.g., 75 for position 1)
  // This is the most important race type, so it should award the most points
  if (raceType === 'final') {
    return pointsEntry.standard;
  }

  // Heat races always use minor points
  if (raceType === 'heat') {
    return pointsEntry.minor;
  }

  // Qualification races: use minor points ONLY if heat race exists, otherwise use standard points
  // Minor points are only used when a heat race exists in the same round/division
  if (hasHeatRace && raceType === 'qualification') {
    return pointsEntry.minor;
  }

  // Default: standard points for qualification when no heat race exists
  return pointsEntry.standard;
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

