// Points system: standard points table
export const getPointsForPosition = (position: number): number => {
  const pointsMap: Record<number, number> = {
    1: 120,
    2: 115,
    3: 110,
    4: 106,
    5: 102,
    6: 98,
    7: 94,
    8: 90,
    9: 86,
    10: 82,
    11: 79,
    12: 76,
    13: 73,
    14: 70,
    15: 67,
    16: 65,
    17: 63,
    18: 61,
    19: 59,
    20: 57,
    21: 55,
    22: 53,
    23: 51,
    24: 49,
    25: 47,
    26: 45,
    27: 43,
    28: 41,
    29: 39,
    30: 37,
    31: 35,
    32: 33,
    33: 31,
    34: 29,
    35: 27,
    36: 25,
    37: 23,
    38: 21,
    39: 19,
    40: 17,
    41: 15,
    42: 13,
    43: 11,
    44: 9,
    45: 7,
    46: 5,
    47: 4,
    48: 3,
    49: 2,
    50: 1,
  };
  return pointsMap[position] || 0;
};

// Helper to calculate total points for a driver from race results
export const calculateDriverPoints = (driverId: string, races: any[]): number => {
  let total = 0;
  races.forEach((race) => {
    if (race.status === 'completed' && race.results) {
      race.results.forEach((divisionResult: any) => {
        const driverResult = divisionResult.results.find((r: any) => r.driverId === driverId);
        if (driverResult) {
          total += driverResult.points;
        }
      });
    }
  });
  return total;
};











